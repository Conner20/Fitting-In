import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { sha256Hex } from "@/lib/token";
import { db } from "@/prisma/client";
import { cleanGymInput, validateCompleteGymInput } from "@/lib/gyms";

type Context = { params: Promise<{ token: string }> };

async function currentEmail() {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) return session.user.email.toLowerCase();
    const onboardingToken = (await cookies()).get("onboarding_token")?.value;
    if (!onboardingToken) return null;
    try {
        const { payload } = await jwtVerify(onboardingToken, new TextEncoder().encode(env.NEXTAUTH_SECRET));
        return typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    } catch { return null; }
}

export async function POST(_req: Request, { params }: Context) {
    const email = await currentEmail();
    if (!email) return NextResponse.json({ message: "Sign up or log in to claim this listing." }, { status: 401 });
    const { token } = await params;
    const invite = await db.gymInvite.findUnique({
        where: { tokenHash: sha256Hex(token) },
        include: { gym: { select: { id: true, name: true, isVerified: true, claims: { where: { status: "PENDING" }, select: { id: true } } } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
        return NextResponse.json({ message: "This invitation is invalid, expired, or has already been used." }, { status: 410 });
    }
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    if (invite.gym.isVerified) {
        await db.$transaction(async (tx) => {
            await tx.user.update({ where: { id: user.id }, data: { role: "GYM" } });
            await tx.gymAccess.upsert({ where: { gymId_userId: { gymId: invite.gymId, userId: user.id } }, create: { gymId: invite.gymId, userId: user.id }, update: {} });
            await tx.gymClaim.upsert({ where: { gymId_claimantId: { gymId: invite.gymId, claimantId: user.id } }, create: { gymId: invite.gymId, claimantId: user.id, status: "APPROVED", businessRole: "Gym representative", evidence: "Account created after admin verification." }, update: { status: "APPROVED", reviewedAt: new Date() } });
            await tx.gymInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
        });
        return NextResponse.json({ message: `Your Gym account is now associated with ${invite.gym.name}.` });
    }
    if (invite.gym.claims.length > 0) return NextResponse.json({ message: `The information for ${invite.gym.name} is already awaiting admin approval.` }, { status: 409 });

    await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { role: "GYM" } });
        await tx.gymClaim.upsert({
            where: { gymId_claimantId: { gymId: invite.gymId, claimantId: user.id } },
            create: { gymId: invite.gymId, claimantId: user.id, businessRole: "Gym representative", evidence: "Submitted through an admin invitation link.", proposedData: invite.proposedData ?? undefined },
            update: { status: "PENDING", businessRole: "Gym representative", evidence: "Submitted through an admin invitation link.", proposedData: invite.proposedData ?? undefined, reviewNote: null, reviewedAt: null, reviewedById: null },
        });
        await tx.gymAccess.upsert({ where: { gymId_userId: { gymId: invite.gymId, userId: user.id } }, create: { gymId: invite.gymId, userId: user.id }, update: {} });
        await tx.gymInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    });
    return NextResponse.json({ message: "Thanks — your information has been submitted and is awaiting admin approval." });
}

export async function PATCH(req: Request, { params }: Context) {
    const { token } = await params;
    const invite = await db.gymInvite.findUnique({ where: { tokenHash: sha256Hex(token) }, select: { id: true, gymId: true, usedAt: true, expiresAt: true, proposedData: true, gym: { select: { name: true, isVerified: true, claims: { where: { status: "PENDING" }, select: { id: true } } } } } });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return NextResponse.json({ message: "This invitation is invalid, expired, or has already been used." }, { status: 410 });
    if (invite.proposedData || invite.gym.claims.length > 0) return NextResponse.json({ message: `The information for ${invite.gym.name} is already awaiting admin approval.` }, { status: 409 });
    if (invite.gym.isVerified) return NextResponse.json({ message: `The listing for ${invite.gym.name} has already been verified.` }, { status: 409 });
    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const { isPublished: _isPublished, ...editable } = data;
    await db.gymInvite.update({ where: { id: invite.id }, data: { proposedData: editable } });
    return NextResponse.json({ message: "Thanks — your information has been submitted for approval. Create an account to claim this listing and manage it going forward." });
}
