import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";
import { cleanGymInput, gymSlug, validateCompleteGymInput } from "@/lib/gyms";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { gymAccesses: { include: { gym: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    return NextResponse.json({ gyms: user.gymAccesses.map(({ gym }) => gym) });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true, role: true } });
    if (!user || user.role !== "GYM") return NextResponse.json({ message: "Only Gym accounts can create gym listings." }, { status: 403 });
    const body = await req.json().catch(() => ({})); const data = cleanGymInput(body); const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const gym = await db.$transaction(async tx => { const created = await tx.gym.create({ data: { ...data, slug: gymSlug(data.name), isVerified: false, isPublished: true } }); await tx.gymAccess.create({ data: { gymId: created.id, userId: user.id } }); return created; });
    return NextResponse.json({ gym }, { status: 201 });
}
