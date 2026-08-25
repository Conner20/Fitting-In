import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailVerificationCode } from "@/lib/mail";
import { db } from "@/prisma/client";

const schema = z.object({
  email: z.string().email(), password: z.string().min(8), gymId: z.string().optional().nullable(),
  visitorId: z.string().optional().nullable(), visitId: z.string().optional().nullable(), clickedAt: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const password = await hash(input.password, 10);
    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({ data: { email, password, role: "TRAINEE" }, select: { id: true } });
      await tx.verificationToken.deleteMany({ where: { identifier: email } });
      await tx.verificationToken.create({ data: { identifier: email, token: code, expires: new Date(Date.now() + 10 * 60 * 1000) } });
      return created;
    });
    try { await sendEmailVerificationCode(email, code); }
    catch (error) {
      await db.$transaction([db.verificationToken.deleteMany({ where: { identifier: email } }), db.user.delete({ where: { id: user.id } })]).catch(()=>undefined);
      throw error;
    }
    if (input.gymId && input.visitorId && input.visitId) await db.landingEvent.create({ data: { eventType: "DAY_PASS_SIGNUP", visitorId: input.visitorId.slice(0,128), visitId: input.visitId.slice(0,128), gymId: input.gymId, userId: user.id, metadata: { email, clickedAt: input.clickedAt || new Date().toISOString() } } }).catch(()=>undefined);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Invalid signup information." }, { status: 400 });
    console.error("[signup]", error);
    return NextResponse.json({ message: "Unable to create your account or send the verification code." }, { status: 500 });
  }
}
