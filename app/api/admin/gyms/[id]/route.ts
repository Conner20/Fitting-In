import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { cleanGymInput, validateCompleteGymInput } from "@/lib/gyms";
import { db } from "@/prisma/client";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const gym = await db.gym.findUnique({ where: { id }, include: { _count: { select: { access: true } } } });
    if (!gym) return NextResponse.json({ message: "Gym not found." }, { status: 404 });
    return NextResponse.json({ gym: { ...gym, isClaimed: gym.isVerified && gym._count.access > 0 } });
}

export async function PATCH(req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const gym = await db.gym.update({ where: { id }, data });
    return NextResponse.json({ gym });
}

export async function DELETE(_req: Request, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await db.gym.delete({ where: { id } });
    return NextResponse.json({ message: "Gym listing deleted." });
}
