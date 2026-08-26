import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { gymAccesses: { where: { gym: { isVerified: true } }, include: { gym: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
    return NextResponse.json({ gyms: user.gymAccesses.map(({ gym }) => gym) });
}

export async function POST() {
    return NextResponse.json({ message: "Gym listings must be verified through an administrator-issued verification link before they can be claimed." }, { status: 403 });
}
