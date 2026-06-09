import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

async function getViewerId() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return null;

    const user = await db.user.findUnique({
        where: { email },
        select: { id: true },
    });

    return user?.id ?? null;
}

export async function GET() {
    const viewerId = await getViewerId();
    if (!viewerId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.$queryRaw<Array<{ favoritedId: string }>>(Prisma.sql`
        SELECT "favoritedId"
        FROM "FavoriteUser"
        WHERE "favoriterId" = ${viewerId}
        ORDER BY "createdAt" DESC
    `);

    return NextResponse.json({
        favoriteUserIds: rows.map((row) => row.favoritedId),
    });
}

export async function POST(req: Request) {
    const viewerId = await getViewerId();
    if (!viewerId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    if (!targetUserId) {
        return NextResponse.json({ message: "Missing target user." }, { status: 400 });
    }
    if (targetUserId === viewerId) {
        return NextResponse.json({ message: "You cannot favorite yourself." }, { status: 400 });
    }

    const target = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
    });
    if (!target?.role) {
        return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await db.$executeRaw(Prisma.sql`
        INSERT INTO "FavoriteUser" ("id", "favoriterId", "favoritedId", "createdAt")
        VALUES (${crypto.randomUUID()}, ${viewerId}, ${targetUserId}, CURRENT_TIMESTAMP)
        ON CONFLICT ("favoriterId", "favoritedId") DO NOTHING
    `);

    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const viewerId = await getViewerId();
    if (!viewerId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    if (!targetUserId) {
        return NextResponse.json({ message: "Missing target user." }, { status: 400 });
    }

    await db.$executeRaw(Prisma.sql`
        DELETE FROM "FavoriteUser"
        WHERE "favoriterId" = ${viewerId} AND "favoritedId" = ${targetUserId}
    `);

    return NextResponse.json({ ok: true });
}
