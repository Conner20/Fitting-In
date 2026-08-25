import { NextResponse } from "next/server";

import { db } from "@/prisma/client";
import { sendEmailVerificationCode } from "@/lib/mail";

export async function POST(req: Request) {
    try {
        const { email } = (await req.json()) as { email?: string };
        const normalized = email?.trim().toLowerCase();
        if (!normalized) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const user = await db.user.findUnique({ where: { email: normalized } });
        if (!user || user.emailVerified) {
            return NextResponse.json({ ok: true });
        }

        await db.verificationToken.deleteMany({ where: { identifier: normalized } });
        const rawToken = String(Math.floor(100000 + Math.random() * 900000));
        await db.verificationToken.create({
            data: {
                identifier: normalized,
                token: rawToken,
                expires: new Date(Date.now() + 1000 * 60 * 10),
            },
        });

        await sendEmailVerificationCode(normalized, rawToken);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[verify-email-request]", error);
        return NextResponse.json({ ok: true });
    }
}
