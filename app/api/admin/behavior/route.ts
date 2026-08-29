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
  const days = [0, 7, 30, 365].includes(requestedDays) ? requestedDays : 30;
  const since = days === 0 ? new Date(0) : new Date(Date.now() - days * 86_400_000);
  const events = await db.landingEvent.findMany({ where: { createdAt: { gte: since } }, select: { eventType: true, visitorId: true, visitId: true, gymId: true, metadata: true, durationMs: true, createdAt: true, gym: { select: { name: true } }, user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 50_000 });
  const [userDates, gymDirectory] = await Promise.all([db.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" } }), db.gym.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  const count = (type: string) => events.filter(event => event.eventType === type).length;
  const visitors = new Set(events.map(event => event.visitorId));
  const visits = new Set(events.map(event => event.visitId));
  type FunnelSets = { gymId: string; name: string; opens: Set<string>; favorites: Set<string>; compares: Set<string>; dayPassClicks: Set<string>; websiteVisits: Set<string>; confirmedClaims: Set<string>; signups: Set<string> };
  const emptyFunnel = (gymId: string, name: string): FunnelSets => ({ gymId, name, opens: new Set<string>(), favorites: new Set<string>(), compares: new Set<string>(), dayPassClicks: new Set<string>(), websiteVisits: new Set<string>(), confirmedClaims: new Set<string>(), signups: new Set<string>() });
  const byGym = new Map<string, FunnelSets>(gymDirectory.map(gym => [gym.id, emptyFunnel(gym.id, gym.name)]));
  const visitorAccounts = new Map(events.filter(event => event.user?.email).map(event => [event.visitorId, event.user!.email!.toLowerCase()]));
  const actorFor = (event: typeof events[number]) => { const email = event.user?.email?.toLowerCase() || visitorAccounts.get(event.visitorId); return email ? `user:${email}` : `visitor:${event.visitorId}`; };
  type ClaimUser = { email: string; clicks: number; confirmed: number; declined: number };
  const claimUsersByGym = new Map<string, Map<string, ClaimUser>>();
  for (const event of events) if (event.gymId) {
    const row = byGym.get(event.gymId) || emptyFunnel(event.gymId, event.gym?.name || "Deleted gym");
    const actor = actorFor(event);
    if (event.eventType === "GYM_OPENED") row.opens.add(actor);
    if (event.eventType === "FAVORITE_ADDED") row.favorites.add(actor);
    if (event.eventType === "COMPARE_ADDED") row.compares.add(actor);
    if (event.eventType === "DAY_PASS_CLICKED") row.dayPassClicks.add(actor);
    if (event.eventType === "WEBSITE_CLICKED") row.websiteVisits.add(actor);
    if (event.eventType === "DAY_PASS_CLAIM_CONFIRMED") row.confirmedClaims.add(actor);
    if (event.eventType === "DAY_PASS_SIGNUP") row.signups.add(actor);
    byGym.set(event.gymId, row);
    const email = event.user?.email?.toLowerCase() || visitorAccounts.get(event.visitorId);
    if (email && ["DAY_PASS_CLICKED", "DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_CLAIM_DECLINED"].includes(event.eventType)) {
      const gymUsers = claimUsersByGym.get(event.gymId) || new Map<string, ClaimUser>();
      const claimUser = gymUsers.get(email) || { email, clicks: 0, confirmed: 0, declined: 0 };
      if (event.eventType === "DAY_PASS_CLICKED") claimUser.clicks++;
      if (event.eventType === "DAY_PASS_CLAIM_CONFIRMED") claimUser.confirmed++;
      if (event.eventType === "DAY_PASS_CLAIM_DECLINED") claimUser.declined++;
      gymUsers.set(email, claimUser); claimUsersByGym.set(event.gymId, gymUsers);
    }
  }
  const gymFunnel = [...byGym.values()].map(row => ({ gymId: row.gymId, name: row.name, opens: row.opens.size, favorites: row.favorites.size, compares: row.compares.size, dayPassClicks: row.dayPassClicks.size, websiteVisits: row.websiteVisits.size, confirmedClaims: row.confirmedClaims.size, signups: row.signups.size, claimUsers: [...(claimUsersByGym.get(row.gymId)?.values() || [])].filter(user => user.clicks > 0).map(user => ({ email: user.email, clicks: user.clicks, status: user.confirmed > 0 ? "confirmed" : user.declined > 0 ? "declined" : "unsure" })).sort((a, b) => b.clicks - a.clicks || a.email.localeCompare(b.email)) }));
  const gymTypes = new Set(["Open", "Personal training gym", "Group training gym", "Specialty gym/studio"]);
  const equipmentFilters = new Set(["Squat rack", "Power rack", "Smith machine", "Bench press", "Deadlift platform", "Olympic lifting platform", "Hack squat", "Pendulum squat", "Belt squat", "Leg press", "Cable station", "Pec deck", "Hip thrust machine", "Dumbbells 100+ lb", "Dumbbells 120+ lb", "Dumbbells 150+ lb"]);
  const amenityFilters = new Set(["Sauna", "Steam room", "Pool", "Showers", "Locker rooms", "Basketball court", "Turf area", "Group classes", "Personal training", "Childcare", "Parking", "24/7 access", "Women's-only area"]);
  const filterCategories = ["Distance", "Day-pass price", "Gym type", "Equipment", "Amenities"] as const;
  const filterUsers = new Map<string, Set<string>>(filterCategories.map(category => [category, new Set<string>()]));
  for (const event of events.filter(event => event.eventType === "FILTER_CHANGED")) { const data = event.metadata as Record<string, unknown> | null; const control = typeof data?.control === "string" ? data.control : ""; const filter = typeof data?.filter === "string" ? data.filter : ""; const category = control === "Distance" ? "Distance" : control === "Day-pass price" ? "Day-pass price" : gymTypes.has(filter) ? "Gym type" : equipmentFilters.has(filter) ? "Equipment" : amenityFilters.has(filter) ? "Amenities" : null; if (category) filterUsers.get(category)!.add(actorFor(event)); }
  const usersByDay = new Map<string, number>(); for (const user of userDates) { const day = user.createdAt.toISOString().slice(0, 10); usersByDay.set(day, (usersByDay.get(day) || 0) + 1); }
  let cumulativeUsers = 0; const userGrowth = [...usersByDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, users: cumulativeUsers += count }));
  const conversions=events.filter(event=>event.eventType==="DAY_PASS_SIGNUP").map(event=>({email:event.user?.email||((event.metadata as Record<string,unknown>|null)?.email as string)||"Unknown",gym:event.gym?.name||"Deleted gym",clickedAt:((event.metadata as Record<string,unknown>|null)?.clickedAt as string)||event.createdAt.toISOString(),signedUpAt:event.createdAt.toISOString()}));
  const confirmedClaimUsers = new Set(events.filter(event => event.eventType === "DAY_PASS_CLAIM_CONFIRMED").map(event => event.user?.email || event.visitorId));
  return NextResponse.json({ days, summary: { visitors: visitors.size, visits: visits.size, returningVisits: Math.max(0, visits.size - visitors.size), gymOpens: count("GYM_OPENED"), favoritesAdded: count("FAVORITE_ADDED"), favoritesRemoved: count("FAVORITE_REMOVED"), comparisons: count("COMPARE_ADDED"), compareViews: count("COMPARE_OPENED"), dayPassClicks: count("DAY_PASS_CLICKED"), dayPassClaims: count("DAY_PASS_CLAIM_CONFIRMED"), uniqueDayPassClaimers: confirmedClaimUsers.size, dayPassSignups: count("DAY_PASS_SIGNUP"), filterUses: count("FILTER_CHANGED"), locationSearches: count("LOCATION_SEARCHED") + count("LOCATION_USED") }, gyms: gymFunnel.sort((a, b) => b.confirmedClaims + b.dayPassClicks + b.signups + b.favorites + b.compares + b.opens - (a.confirmedClaims + a.dayPassClicks + a.signups + a.favorites + a.compares + a.opens)), conversions, filters: filterCategories.map(name => ({ name, uses: filterUsers.get(name)!.size })), userGrowth, recent: events.slice(0, 100).map(event => ({ ...event, metadata: event.metadata || null })) });
 } catch (error) {
  console.error("Failed to load admin behavior analytics", error);
  return NextResponse.json({ error: "Behavior analytics are temporarily unavailable. Confirm that the latest database migration has been applied, then try again." }, { status: 500 });
 }
}
