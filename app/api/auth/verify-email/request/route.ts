import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

import { db } from "@/prisma/client";
import { sendEmailVerificationCode } from "@/lib/mail";

export async function POST(req: Request) {
    try {
        const { email } = (await req.json()) as { email?: string };
        const normalized = email?.trim().toLowerCase();
        if (!normalized) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const [user, pendingSignup] = await Promise.all([
            db.user.findUnique({ where: { email: normalized }, select: { emailVerified: true, deletedAt: true } }),
            db.pendingSignup.findUnique({ where: { email: normalized }, select: { expires: true } }),
        ]);
        if ((user?.emailVerified && !user.deletedAt) || !pendingSignup) {
            return NextResponse.json({ ok: true });
        }

        const rawToken = String(randomInt(100000, 1000000));
        const expires = new Date(Date.now() + 1000 * 60 * 10);
        await db.$transaction(async tx => {
            await tx.verificationToken.deleteMany({ where: { identifier: normalized } });
            await tx.verificationToken.create({
                data: { identifier: normalized, token: rawToken, expires },
            });
            await tx.pendingSignup.update({ where: { email: normalized }, data: { expires } });
        });

        await sendEmailVerificationCode(normalized, rawToken);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[verify-email-request]", error);
        return NextResponse.json({ ok: true });
    }
}
