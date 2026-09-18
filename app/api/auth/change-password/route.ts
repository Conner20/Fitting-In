import { compare, hash } from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "You must be logged in to change your password." }, { status: 401 });
    }

    const input = schema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ error: "Enter your current password and a new password of at least 8 characters." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });
    if (!user?.password || !(await compare(input.data.currentPassword, user.password))) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
    }

    if (await compare(input.data.newPassword, user.password)) {
      return NextResponse.json({ error: "Your new password must be different from your current password." }, { status: 400 });
    }

    const password = await hash(input.data.newPassword, 12);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { password } }),
      db.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[change-password]", error);
    return NextResponse.json({ error: "Unable to change your password right now." }, { status: 500 });
  }
}
