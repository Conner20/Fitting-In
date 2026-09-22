import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    if (body.role === "GYM") return NextResponse.json({ message: "Gym roles are assigned only when an account claims and verifies a gym listing." }, { status: 403 });

    const role = "TRAINEE";
    const location = typeof body.location === "string" ? body.location.trim() : undefined;
    const existing = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { _count: { select: { gymAccesses: true } } } });
    if (existing?._count.gymAccesses) return NextResponse.json({ message: "An account that owns a gym listing must remain a Gym account." }, { status: 409 });
    const user = await db.user.update({ where: { email: session.user.email.toLowerCase() }, data: { role, ...(location ? { location } : {}) }, select: { id: true, email: true, role: true } });
    const maxAge = authOptions.session?.maxAge ?? 60 * 60 * 24 * 365 * 100;
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, maxAge, token: { sub: user.id, email: user.email, role: user.role } });
    const response = NextResponse.json({ user, message: "Account updated" });
    response.cookies.set(process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
    response.cookies.set("next-auth.callback-url", "/", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
    return response;
}
