import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export async function GET(request: Request) {
 try {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const events = await db.landingEvent.findMany({ where: { createdAt: { gte: since } }, select: { eventType: true, visitorId: true, visitId: true, gymId: true, metadata: true, durationMs: true, createdAt: true, gym: { select: { name: true } }, user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 50_000 });
  const count = (type: string) => events.filter(event => event.eventType === type).length;
  const visitors = new Set(events.map(event => event.visitorId));
  const visits = new Set(events.map(event => event.visitId));
  const durations = events.filter(event => event.eventType === "TIME_SPENT" && event.durationMs).map(event => event.durationMs || 0);
  const byGym = new Map<string, { gymId: string; name: string; opens: number; favorites: number; compares: number; dayPassClicks: number; signups: number }>();
  for (const event of events) if (event.gymId) { const row = byGym.get(event.gymId) || { gymId: event.gymId, name: event.gym?.name || "Deleted gym", opens: 0, favorites: 0, compares: 0, dayPassClicks: 0, signups: 0 }; if (event.eventType === "GYM_OPENED") row.opens++; if (event.eventType === "FAVORITE_ADDED") row.favorites++; if (event.eventType === "COMPARE_ADDED") row.compares++; if (event.eventType === "DAY_PASS_CLICKED") row.dayPassClicks++; if (event.eventType === "DAY_PASS_SIGNUP") row.signups++; byGym.set(event.gymId, row); }
  const filterCounts = new Map<string, number>();
  for (const event of events.filter(event => event.eventType === "FILTER_CHANGED")) { const data = event.metadata as Record<string, unknown> | null; const label = typeof data?.filter === "string" ? data.filter : typeof data?.control === "string" ? data.control : "Unknown"; filterCounts.set(label, (filterCounts.get(label) || 0) + 1); }
  const daysMap = new Map<string, number>(); for (const event of events) { const day = event.createdAt.toISOString().slice(0, 10); daysMap.set(day, (daysMap.get(day) || 0) + 1); }
  const conversions=events.filter(event=>event.eventType==="DAY_PASS_SIGNUP").map(event=>({email:event.user?.email||((event.metadata as Record<string,unknown>|null)?.email as string)||"Unknown",gym:event.gym?.name||"Deleted gym",clickedAt:((event.metadata as Record<string,unknown>|null)?.clickedAt as string)||event.createdAt.toISOString(),signedUpAt:event.createdAt.toISOString()}));
  return NextResponse.json({ days, summary: { visitors: visitors.size, visits: visits.size, returningVisits: Math.max(0, visits.size - visitors.size), averageTimeSeconds: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000) : 0, gymOpens: count("GYM_OPENED"), favoritesAdded: count("FAVORITE_ADDED"), favoritesRemoved: count("FAVORITE_REMOVED"), comparisons: count("COMPARE_ADDED"), compareViews: count("COMPARE_OPENED"), dayPassClicks: count("DAY_PASS_CLICKED"), dayPassSignups: count("DAY_PASS_SIGNUP"), filterUses: count("FILTER_CHANGED"), locationSearches: count("LOCATION_SEARCHED") + count("LOCATION_USED") }, gyms: [...byGym.values()].sort((a, b) => b.dayPassClicks + b.signups + b.favorites + b.compares + b.opens - (a.dayPassClicks + a.signups + a.favorites + a.compares + a.opens)).slice(0, 50), conversions, filters: [...filterCounts].map(([name, uses]) => ({ name, uses })).sort((a, b) => b.uses - a.uses), daily: [...daysMap].map(([date, events]) => ({ date, events })).sort((a, b) => a.date.localeCompare(b.date)), recent: events.slice(0, 100).map(event => ({ ...event, metadata: event.metadata || null })) });
 } catch (error) {
  console.error("Failed to load admin behavior analytics", error);
  return NextResponse.json({ error: "Behavior analytics are temporarily unavailable. Confirm that the latest database migration has been applied, then try again." }, { status: 500 });
 }
}
