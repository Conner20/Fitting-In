import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { generateRawToken, sha256Hex } from "@/lib/token";
import { db } from "@/prisma/client";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const creator = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true } });
    if (!creator) return NextResponse.json({ message: "Admin user not found." }, { status: 404 });
    const { id: gymId } = await params;
    const gym = await db.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true } });
    if (!gym) return NextResponse.json({ message: "Gym not found." }, { status: 404 });

    const rawToken = generateRawToken(32);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    await db.gymInvite.create({ data: { gymId, createdById: creator.id, tokenHash: sha256Hex(rawToken), expiresAt } });
    return NextResponse.json({ url: `${new URL(req.url).origin}/gym-invite/${rawToken}`, expiresAt, gymName: gym.name }, { status: 201 });
}
