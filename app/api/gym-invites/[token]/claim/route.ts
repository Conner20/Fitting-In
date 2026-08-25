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
        include: { gym: { select: { id: true, name: true } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
        return NextResponse.json({ message: "This invitation is invalid, expired, or has already been used." }, { status: 410 });
    }
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });

    await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { role: "GYM" } });
        await tx.gymClaim.upsert({
            where: { gymId_claimantId: { gymId: invite.gymId, claimantId: user.id } },
            create: { gymId: invite.gymId, claimantId: user.id, businessRole: "Gym representative", evidence: "Submitted through an admin invitation link." },
            update: { status: "PENDING", businessRole: "Gym representative", evidence: "Submitted through an admin invitation link.", reviewNote: null, reviewedAt: null, reviewedById: null },
        });
        await tx.gymInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    });
    return NextResponse.json({ message: `Your claim for ${invite.gym.name} is pending admin approval.` });
}

export async function PATCH(req: Request, { params }: Context) {
    const { token } = await params;
    const invite = await db.gymInvite.findUnique({ where: { tokenHash: sha256Hex(token) }, select: { id: true, gymId: true, usedAt: true, expiresAt: true } });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return NextResponse.json({ message: "This invitation is invalid, expired, or has already been used." }, { status: 410 });
    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const { isPublished: _isPublished, ...editable } = data;
    const gym = await db.gym.update({ where: { id: invite.gymId }, data: editable });
    return NextResponse.json({ gym, message: "Gym information verified." });
}
