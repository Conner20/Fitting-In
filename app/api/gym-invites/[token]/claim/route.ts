import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { cleanGymInput, validateCompleteGymInput } from "@/lib/gyms";
import { PENDING_GYM_INVITE_COOKIE } from "@/lib/pending-gym-invite";
import { sha256Hex } from "@/lib/token";
import { db } from "@/prisma/client";

type Context = { params: Promise<{ token: string }> };

export async function PATCH(req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    const accountEmail = session?.user?.email?.trim().toLowerCase();
    if (!accountEmail) return NextResponse.json({ message: "Sign up or log in before claiming this listing." }, { status: 401 });

    const { token } = await params;
    const invite = await db.gymInvite.findUnique({
        where: { tokenHash: sha256Hex(token) },
        select: { id: true, gymId: true, usedAt: true, expiresAt: true, gym: { select: { name: true, _count: { select: { access: true } } } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return NextResponse.json({ message: "This invitation is invalid, expired, or has already been used." }, { status: 410 });
    if (invite.gym._count.access) return NextResponse.json({ message: `The listing for ${invite.gym.name} has already been claimed.` }, { status: 409 });

    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const { isPublished: _isPublished, ...editable } = data;
    const claimedAt = new Date();

    try {
        await db.$transaction(async tx => {
            const user = await tx.user.findUnique({ where: { email: accountEmail }, select: { id: true, emailVerified: true, gymAccesses: { select: { gymId: true } } } });
            if (!user?.emailVerified) throw new Error("VERIFIED_ACCOUNT_REQUIRED");
            if (user.gymAccesses.some(access => access.gymId !== invite.gymId)) throw new Error("ACCOUNT_ALREADY_HAS_GYM");
            const otherOwner = await tx.gymAccess.findFirst({ where: { gymId: invite.gymId, userId: { not: user.id } }, select: { id: true } });
            if (otherOwner) throw new Error("GYM_ALREADY_CLAIMED");

            await tx.gym.update({ where: { id: invite.gymId }, data: { ...editable, isVerified: true, verifiedAt: claimedAt, verifiedByEmail: accountEmail } });
            await tx.user.update({ where: { id: user.id }, data: { role: "GYM" } });
            await tx.gymAccess.upsert({ where: { gymId_userId: { gymId: invite.gymId, userId: user.id } }, create: { gymId: invite.gymId, userId: user.id }, update: {} });
            await tx.gymClaim.upsert({
                where: { gymId_claimantId: { gymId: invite.gymId, claimantId: user.id } },
                create: { gymId: invite.gymId, claimantId: user.id, status: "APPROVED", businessRole: "Gym representative", evidence: "Claimed through an administrator-issued verification link.", reviewedAt: claimedAt },
                update: { status: "APPROVED", proposedData: editable, reviewedAt: claimedAt },
            });
            await tx.gymInvite.update({ where: { id: invite.id }, data: { usedAt: claimedAt, proposedData: editable } });
        });
    } catch (error) {
        if (error instanceof Error && error.message === "VERIFIED_ACCOUNT_REQUIRED") return NextResponse.json({ message: "A verified account is required to claim this listing." }, { status: 401 });
        if (error instanceof Error && error.message === "ACCOUNT_ALREADY_HAS_GYM") return NextResponse.json({ message: "This account is already associated with another gym listing." }, { status: 409 });
        if (error instanceof Error && error.message === "GYM_ALREADY_CLAIMED") return NextResponse.json({ message: "This gym listing has already been claimed." }, { status: 409 });
        throw error;
    }

    const response = NextResponse.json({ message: `You claimed and verified ${invite.gym.name}.`, gymId: invite.gymId });
    response.cookies.delete(PENDING_GYM_INVITE_COOKIE);
    return response;
}
