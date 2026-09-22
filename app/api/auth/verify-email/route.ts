import { NextResponse } from "next/server";
import { SignJWT } from "jose";

import { db } from "@/prisma/client";
import { env } from "@/lib/env";
import { getCurrentLegalDates } from "@/lib/legal-documents";

export async function POST(req: Request) {
    try {
        const body = await req.json() as { email?: string; code?: string };
        const email = body.email?.trim().toLowerCase();
        const code = body.code?.trim();
        if (!email || !/^\d{6}$/.test(code || "")) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
        const [token, pendingSignup] = await Promise.all([
            db.verificationToken.findFirst({ where: { identifier: email, token: code } }),
            db.pendingSignup.findUnique({ where: { email } }),
        ]);
        const now = new Date();
        if (!token || token.expires < now || !pendingSignup || pendingSignup.expires < now) {
            if (pendingSignup?.expires && pendingSignup.expires < now) {
                await db.$transaction([
                    db.verificationToken.deleteMany({ where: { identifier: email } }),
                    db.pendingSignup.deleteMany({ where: { email } }),
                ]).catch(() => undefined);
            }
            return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
        }

        const legalDates = await getCurrentLegalDates();
        await db.$transaction(async tx => {
            const existing = await tx.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
            if (existing?.emailVerified) throw new Error("ACCOUNT_ALREADY_EXISTS");
            if (existing) await tx.user.delete({ where: { id: existing.id } });

            const user = await tx.user.create({
                data: {
                    email,
                    password: pendingSignup.passwordHash,
                    emailVerified: now,
                    role: "TRAINEE",
                    termsAcceptedAt: legalDates.terms,
                    privacyAcceptedAt: legalDates.privacy,
                },
                select: { id: true },
            });

            if (pendingSignup.gymId && pendingSignup.visitorId && pendingSignup.visitId) {
                const gym = await tx.gym.findUnique({ where: { id: pendingSignup.gymId }, select: { id: true } });
                if (gym) {
                    const clickType = pendingSignup.intent === "membership" ? "MEMBERSHIP_CLICKED" : "DAY_PASS_CLICKED";
                    const signupType = pendingSignup.intent === "membership" ? "MEMBERSHIP_SIGNUP" : "DAY_PASS_SIGNUP";
                    await tx.landingEvent.updateMany({
                        where: {
                            eventType: clickType,
                            visitorId: pendingSignup.visitorId,
                            gymId: gym.id,
                            userId: null,
                        },
                        data: { userId: user.id },
                    });
                    await tx.landingEvent.create({
                        data: {
                            eventType: signupType,
                            visitorId: pendingSignup.visitorId,
                            visitId: pendingSignup.visitId,
                            gymId: gym.id,
                            userId: user.id,
                            metadata: {
                                email,
                                clickedAt: pendingSignup.clickedAt || now.toISOString(),
                            },
                        },
                    });
                }
            }

            await tx.verificationToken.deleteMany({ where: { identifier: email } });
            await tx.pendingSignup.delete({ where: { email } });
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof Error && error.message === "ACCOUNT_ALREADY_EXISTS") {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
        console.error("[verify-email-code]", error);
        return NextResponse.json({ error: "Unable to verify the code." }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token")?.trim();
        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const vt = await db.verificationToken.findFirst({ where: { token } });
        if (!vt || vt.expires < new Date()) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        const user = await db.user.update({
            where: { email: vt.identifier },
            data: { emailVerified: new Date() },
            select: {
                id: true,
                role: true,
                email: true,
                image: true,
            },
        });

        await db.verificationToken.deleteMany({ where: { identifier: vt.identifier } });

        const gymInvite = req.headers.get("cookie")?.match(/(?:^|; )gym_invite=([^;]+)/)?.[1];
        const callbackUrl = gymInvite
            ? `/gym-invite/${encodeURIComponent(decodeURIComponent(gymInvite))}`
            : `/user-onboarding?email=${encodeURIComponent(user.email ?? "")}`;

        const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);
        const tokenPayload = {
            email: user.email,
        };
        const onboardingToken = await new SignJWT(tokenPayload)
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(secret);

        const res = NextResponse.json({ ok: true, callbackUrl });
        res.cookies.set("onboarding_token", onboardingToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24, // 1 day
        });
        if (gymInvite) res.cookies.delete("gym_invite");

        return res;
    } catch (error) {
        console.error("[verify-email]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
