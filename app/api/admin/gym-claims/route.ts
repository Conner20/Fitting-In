import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const claims = await db.gymClaim.findMany({
        where: { status: "PENDING" },
        include: {
            gym: true,
            claimant: { select: { id: true, name: true, username: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ claims });
}
