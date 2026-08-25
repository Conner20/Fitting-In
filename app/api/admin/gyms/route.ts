import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { cleanGymInput, gymSlug, validateCompleteGymInput } from "@/lib/gyms";
import { db } from "@/prisma/client";

async function authorize() {
    const session = await getServerSession(authOptions);
    return session?.user?.email && await hasAdminAccessByEmail(session.user.email);
}

export async function GET(req: Request) {
    if (!(await authorize())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const gyms = await db.gym.findMany({
        where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { address: { contains: query, mode: "insensitive" } }] } : {},
        include: {
            _count: { select: { access: true } },
            claims: { where: { status: "PENDING" }, select: { id: true } },
        },
        orderBy: { name: "asc" },
        take: 200,
    });
    return NextResponse.json({ gyms: gyms.map((gym) => ({ ...gym, isClaimed: gym._count.access > 0 })) });
}

export async function POST(req: Request) {
    if (!(await authorize())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const data = cleanGymInput(body);
    const missing = validateCompleteGymInput(body, data);
    if (missing.length) return NextResponse.json({ message: `Complete these required fields: ${missing.join(", ")}.` }, { status: 400 });
    const gym = await db.gym.create({ data: { ...data, slug: gymSlug(data.name), isVerified: false } });
    return NextResponse.json({ gym, isClaimed: false }, { status: 201 });
}
