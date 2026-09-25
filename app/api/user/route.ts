import { hash } from "bcrypt";
import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailVerificationCode } from "@/lib/mail";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

const schema = z.object({
  email: z.string().email(), password: z.string().min(8), gymId: z.string().optional().nullable(), intent: z.enum(["day-pass", "membership"]).optional().default("day-pass"),
  visitorId: z.string().optional().nullable(), visitId: z.string().optional().nullable(), clickedAt: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ isAdmin: false }, { status: 401 });
  return NextResponse.json({ isAdmin: await hasAdminAccessByEmail(session.user.email) });
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, deletedAt: true } });
    if (existing?.emailVerified && !existing.deletedAt) return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    const existingPending = await db.pendingSignup.findUnique({ where: { email }, select: { email: true } });
    const code = String(randomInt(100000, 1000000));
    const passwordHash = await hash(input.password, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await db.$transaction(async tx => {
      await tx.pendingSignup.deleteMany({ where: { expires: { lt: new Date() } } });
      // Remove only legacy, incomplete accounts created by the previous signup
      // flow. Verified accounts are rejected above and are never touched.
      if (existing && !existing.deletedAt) await tx.user.delete({ where: { id: existing.id } });
      await tx.pendingSignup.upsert({
        where: { email },
        create: {
          email, passwordHash, gymId: input.gymId || null, intent: input.intent,
          visitorId: input.visitorId?.slice(0, 128) || null,
          visitId: input.visitId?.slice(0, 128) || null,
          clickedAt: input.clickedAt || null, expires,
        },
        update: {
          passwordHash, gymId: input.gymId || null, intent: input.intent,
          visitorId: input.visitorId?.slice(0, 128) || null,
          visitId: input.visitId?.slice(0, 128) || null,
          clickedAt: input.clickedAt || null, expires,
        },
      });
      await tx.verificationToken.deleteMany({ where: { identifier: email } });
      await tx.verificationToken.create({ data: { identifier: email, token: code, expires } });
    });
    try { await sendEmailVerificationCode(email, code); }
    catch (error) {
      await db.$transaction(async tx => {
        await tx.verificationToken.deleteMany({ where: { identifier: email } });
        await tx.pendingSignup.deleteMany({ where: { email } });
      }).catch(()=>undefined);
      throw error;
    }
    return NextResponse.json({ ok: true, resumed: Boolean(existingPending) }, { status: existingPending ? 200 : 202 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Invalid signup information." }, { status: 400 });
    console.error("[signup]", error);
    return NextResponse.json({ message: "Unable to create your account or send the verification code." }, { status: 500 });
  }
}
