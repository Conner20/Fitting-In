import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

const ALLOWED = new Set(["VISIT", "TIME_SPENT", "GYM_OPENED", "FAVORITE_ADDED", "FAVORITE_REMOVED", "COMPARE_ADDED", "COMPARE_REMOVED", "COMPARE_OPENED", "DAY_PASS_CLICKED", "FILTER_OPENED", "FILTER_CHANGED", "FILTER_CLEARED", "LOCATION_SEARCHED", "LOCATION_USED", "SORT_CHANGED", "MAP_VIEWED", "LIST_VIEWED"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 128) : "";
    const visitId = typeof body.visitId === "string" ? body.visitId.slice(0, 128) : "";
    if (!ALLOWED.has(eventType) || !visitorId || !visitId) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const session = await getServerSession(authOptions);
    const user = session?.user?.email ? await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true } }) : null;
    const gymId = typeof body.gymId === "string" && body.gymId ? body.gymId : null;
    const durationMs = typeof body.durationMs === "number" && Number.isFinite(body.durationMs) ? Math.max(0, Math.min(Math.round(body.durationMs), 86_400_000)) : null;
    const metadata = body.metadata && typeof body.metadata === "object" ? JSON.parse(JSON.stringify(body.metadata)) : undefined;
    await db.landingEvent.create({ data: { eventType, visitorId, visitId, path: "/", gymId, userId: user?.id, durationMs, metadata } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to record event" }, { status: 400 });
  }
}
