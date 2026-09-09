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
  const events = await db.landingEvent.findMany({ where: { createdAt: { gte: since } }, select: { id: true, eventType: true, visitorId: true, visitId: true, gymId: true, metadata: true, durationMs: true, createdAt: true, gym: { select: { name: true } }, user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 50_000 });
  const [userDates, gymDirectory] = await Promise.all([db.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" } }), db.gym.findMany({ select: { id: true, name: true, contactEmail: true, access: { select: { user: { select: { email: true } } }, orderBy: { createdAt: "asc" }, take: 1 } }, orderBy: { name: "asc" } })]);
  const count = (type: string) => events.filter(event => event.eventType === type).length;
  const visitors = new Set(events.map(event => event.visitorId));
  const visits = new Set(events.map(event => event.visitId));
  type FunnelSets = { gymId: string; name: string; reportEmail: string; opens: Set<string>; favorites: Set<string>; compares: Set<string>; dayPassClicks: Set<string>; websiteVisits: Set<string>; confirmedClaims: Set<string>; signups: Set<string>; membershipClicks: Set<string>; confirmedMemberships: Set<string>; membershipSignups: Set<string> };
  const emptyFunnel = (gymId: string, name: string, reportEmail = ""): FunnelSets => ({ gymId, name, reportEmail, opens: new Set<string>(), favorites: new Set<string>(), compares: new Set<string>(), dayPassClicks: new Set<string>(), websiteVisits: new Set<string>(), confirmedClaims: new Set<string>(), signups: new Set<string>(), membershipClicks: new Set<string>(), confirmedMemberships: new Set<string>(), membershipSignups: new Set<string>() });
  const byGym = new Map<string, FunnelSets>(gymDirectory.map(gym => [gym.id, emptyFunnel(gym.id, gym.name, gym.access[0]?.user.email || gym.contactEmail || "")]));
  const visitorAccounts = new Map(events.filter(event => event.user?.email).map(event => [event.visitorId, event.user!.email!.toLowerCase()]));
  const actorFor = (event: typeof events[number]) => { const email = event.user?.email?.toLowerCase() || visitorAccounts.get(event.visitorId); return email ? `user:${email}` : `visitor:${event.visitorId}`; };
  type ClaimUser = { email: string; clicks: number; clickTimestamps: string[]; confirmed: number; declined: number };
  const claimUsersByGym = new Map<string, Map<string, ClaimUser>>();
  for (const event of events) if (event.gymId) {
    const row = byGym.get(event.gymId) || emptyFunnel(event.gymId, event.gym?.name || "Deleted gym");
    const actor = actorFor(event);
    if (event.eventType === "GYM_OPENED") row.opens.add(actor);
    if (event.eventType === "FAVORITE_ADDED") row.favorites.add(actor);
    if (event.eventType === "COMPARE_ADDED") row.compares.add(actor);
    if (event.eventType === "DAY_PASS_CLICKED") row.dayPassClicks.add(actor);
    if (event.eventType === "WEBSITE_CLICKED") row.websiteVisits.add(actor);
    if (["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)) row.confirmedClaims.add(actor);
    if (event.eventType === "DAY_PASS_SIGNUP") row.signups.add(actor);
    if (event.eventType === "MEMBERSHIP_CLICKED") row.membershipClicks.add(actor);
    if (["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)) row.confirmedMemberships.add(actor);
    if (event.eventType === "MEMBERSHIP_SIGNUP") row.membershipSignups.add(actor);
    byGym.set(event.gymId, row);
    const email = event.user?.email?.toLowerCase() || visitorAccounts.get(event.visitorId);
    if (email && ["DAY_PASS_CLICKED", "DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED", "DAY_PASS_CLAIM_DECLINED"].includes(event.eventType)) {
      const gymUsers = claimUsersByGym.get(event.gymId) || new Map<string, ClaimUser>();
      const claimUser = gymUsers.get(email) || { email, clicks: 0, clickTimestamps: [], confirmed: 0, declined: 0 };
      if (event.eventType === "DAY_PASS_CLICKED") { claimUser.clicks++; claimUser.clickTimestamps.push(event.createdAt.toISOString()); }
      if (["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)) claimUser.confirmed++;
      if (event.eventType === "DAY_PASS_CLAIM_DECLINED") claimUser.declined++;
      gymUsers.set(email, claimUser); claimUsersByGym.set(event.gymId, gymUsers);
    }
  }
  const gymFunnel = [...byGym.values()].map(row => ({ gymId: row.gymId, name: row.name, reportEmail: row.reportEmail, opens: row.opens.size, favorites: row.favorites.size, compares: row.compares.size, dayPassClicks: row.dayPassClicks.size, websiteVisits: row.websiteVisits.size, confirmedClaims: row.confirmedClaims.size, signups: row.signups.size, membershipClicks: row.membershipClicks.size, confirmedMemberships: row.confirmedMemberships.size, membershipSignups: row.membershipSignups.size, claimUsers: [...(claimUsersByGym.get(row.gymId)?.values() || [])].filter(user => user.clicks > 0).map(user => ({ email: user.email, clicks: user.clicks, clickTimestamps: user.clickTimestamps, status: user.confirmed > 0 ? "confirmed" : user.declined > 0 ? "declined" : "unsure" })).sort((a, b) => b.clicks - a.clicks || a.email.localeCompare(b.email)) }));
  const gymTypes = new Set(["Open", "Personal training gym", "Group training gym", "Specialty gym/studio"]);
  const equipmentFilters = new Set(["Squat rack", "Power rack", "Smith machine", "Bench press", "Deadlift platform", "Olympic lifting platform", "Hack squat", "Pendulum squat", "Belt squat", "Leg press", "Cable station", "Pec deck", "Hip thrust machine", "Dumbbells 100+ lb", "Dumbbells 120+ lb", "Dumbbells 150+ lb"]);
  const amenityFilters = new Set(["Sauna", "Steam room", "Pool", "Showers", "Locker rooms", "Basketball court", "Turf area", "Group classes", "Personal training", "Childcare", "Parking", "24/7 access", "Women's-only area"]);
  const filterCategories = ["Distance", "Day-pass price", "Membership price", "Gym type", "Equipment", "Amenities"] as const;
  const filterUsers = new Map<string, Set<string>>(filterCategories.map(category => [category, new Set<string>()]));
  for (const event of events.filter(event => event.eventType === "FILTER_CHANGED")) { const data = event.metadata as Record<string, unknown> | null; const control = typeof data?.control === "string" ? data.control : ""; const filter = typeof data?.filter === "string" ? data.filter : ""; const category = control === "Distance" ? "Distance" : control === "Day-pass price" ? "Day-pass price" : control === "Membership price" ? "Membership price" : gymTypes.has(filter) ? "Gym type" : equipmentFilters.has(filter) ? "Equipment" : amenityFilters.has(filter) ? "Amenities" : null; if (category) filterUsers.get(category)!.add(actorFor(event)); }
  const usersByDay = new Map<string, number>(); for (const user of userDates) { const day = user.createdAt.toISOString().slice(0, 10); usersByDay.set(day, (usersByDay.get(day) || 0) + 1); }
  const today = new Date().toISOString().slice(0, 10);
  let cumulativeUsers = 0;
  let userGrowth: { date: string; users: number }[];
  if (days === 0) {
    userGrowth = [...usersByDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, users: cumulativeUsers += count }));
  } else {
    const requestedStartDate = since.toISOString().slice(0, 10);
    const firstUserDate = userDates[0]?.createdAt.toISOString().slice(0, 10) || today;
    const startDate = requestedStartDate > firstUserDate ? requestedStartDate : firstUserDate;
    const scopedStart = new Date(`${startDate}T00:00:00.000Z`);
    cumulativeUsers = userDates.filter(user => user.createdAt < scopedStart).length;
    const scopedDays = [...usersByDay].filter(([date]) => date >= startDate && date <= today).sort(([a], [b]) => a.localeCompare(b));
    userGrowth = scopedDays.map(([date, count]) => ({ date, users: cumulativeUsers += count }));
    if (!userGrowth.length || userGrowth[0].date !== startDate) userGrowth.unshift({ date: startDate, users: userDates.filter(user => user.createdAt < new Date(`${startDate}T23:59:59.999Z`)).length });
    if (userGrowth.at(-1)?.date !== today) userGrowth.push({ date: today, users: userDates.filter(user => user.createdAt <= new Date(`${today}T23:59:59.999Z`)).length });
  }
  type TrendMetric = "users" | "uniqueVisitors" | "gymProfilesOpened" | "uniqueDayPassClickers" | "confirmedDayPasses" | "uniqueMembershipClickers" | "confirmedMemberships";
  type TrendPoint = { date: string; users: number; uniqueVisitors: number; gymProfilesOpened: number; uniqueDayPassClickers: number; confirmedDayPasses: number; uniqueMembershipClickers: number; confirmedMemberships: number; changed: TrendMetric[] };
  const firstEventDate = events.length ? events[events.length - 1].createdAt.toISOString().slice(0, 10) : today;
  const firstRecordedDate = [userDates[0]?.createdAt.toISOString().slice(0, 10), firstEventDate].filter((date): date is string => Boolean(date)).sort()[0] || today;
  const requestedTrendStart = days === 0 ? firstRecordedDate : since.toISOString().slice(0, 10);
  const trendStart = requestedTrendStart > firstRecordedDate ? requestedTrendStart : firstRecordedDate;
  const eventsByDay = new Map<string, typeof events>();
  for (const event of [...events].reverse()) {
    const date = event.createdAt.toISOString().slice(0, 10);
    if (date < trendStart || date > today) continue;
    eventsByDay.set(date, [...(eventsByDay.get(date) || []), event]);
  }
  const trendVisitors = new Set<string>(), trendDayPassClickers = new Set<string>(), trendMembershipClickers = new Set<string>(), trendConfirmedDayPasses = new Set<string>(), trendConfirmedMemberships = new Set<string>();
  let trendProfileOpens = 0;
  const trendData: TrendPoint[] = [];
  for (let cursor = new Date(`${trendStart}T00:00:00.000Z`), end = new Date(`${today}T00:00:00.000Z`); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const date = cursor.toISOString().slice(0, 10);
    const before = { uniqueVisitors: trendVisitors.size, gymProfilesOpened: trendProfileOpens, uniqueDayPassClickers: trendDayPassClickers.size, confirmedDayPasses: trendConfirmedDayPasses.size, uniqueMembershipClickers: trendMembershipClickers.size, confirmedMemberships: trendConfirmedMemberships.size };
    for (const event of eventsByDay.get(date) || []) {
      trendVisitors.add(event.visitorId);
      if (event.eventType === "GYM_OPENED") trendProfileOpens++;
      if (event.eventType === "DAY_PASS_CLICKED") trendDayPassClickers.add(actorFor(event));
      if (["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)) { const metadata=event.metadata as Record<string,unknown>|null,claimId=event.eventType==="DAY_PASS_GYM_CONFIRMED"&&typeof metadata?.claimClickId==="string"?metadata.claimClickId:events.find(click=>click.eventType==="DAY_PASS_CLICKED"&&click.gymId===event.gymId&&actorFor(click)===actorFor(event)&&click.createdAt<=event.createdAt)?.id||event.id;trendConfirmedDayPasses.add(claimId); }
      if (event.eventType === "MEMBERSHIP_CLICKED") trendMembershipClickers.add(actorFor(event));
      if (["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)) { const metadata=event.metadata as Record<string,unknown>|null,claimId=event.eventType==="MEMBERSHIP_GYM_CONFIRMED"&&typeof metadata?.claimClickId==="string"?metadata.claimClickId:events.find(click=>click.eventType==="MEMBERSHIP_CLICKED"&&click.gymId===event.gymId&&actorFor(click)===actorFor(event)&&click.createdAt<=event.createdAt)?.id||event.id;trendConfirmedMemberships.add(claimId); }
    }
    const changed: TrendMetric[] = [];
    if (usersByDay.has(date)) changed.push("users");
    if (trendVisitors.size !== before.uniqueVisitors) changed.push("uniqueVisitors");
    if (trendProfileOpens !== before.gymProfilesOpened) changed.push("gymProfilesOpened");
    if (trendDayPassClickers.size !== before.uniqueDayPassClickers) changed.push("uniqueDayPassClickers");
    if (trendConfirmedDayPasses.size !== before.confirmedDayPasses) changed.push("confirmedDayPasses");
    if (trendMembershipClickers.size !== before.uniqueMembershipClickers) changed.push("uniqueMembershipClickers");
    if (trendConfirmedMemberships.size !== before.confirmedMemberships) changed.push("confirmedMemberships");
    if (changed.length || date === trendStart || date === today) trendData.push({ date, users: userDates.filter(user => user.createdAt <= new Date(`${date}T23:59:59.999Z`)).length, uniqueVisitors: trendVisitors.size, gymProfilesOpened: trendProfileOpens, uniqueDayPassClickers: trendDayPassClickers.size, confirmedDayPasses: trendConfirmedDayPasses.size, uniqueMembershipClickers: trendMembershipClickers.size, confirmedMemberships: trendConfirmedMemberships.size, changed });
  }
  const conversions=events.filter(event=>event.eventType==="DAY_PASS_SIGNUP").map(event=>({email:event.user?.email||((event.metadata as Record<string,unknown>|null)?.email as string)||"Unknown",gym:event.gym?.name||"Deleted gym",clickedAt:((event.metadata as Record<string,unknown>|null)?.clickedAt as string)||event.createdAt.toISOString(),signedUpAt:event.createdAt.toISOString()}));
  const claimClickLogs = events.filter(event => event.eventType === "DAY_PASS_CLICKED" && event.gymId && event.gym).map(click => {
    const clickActor = actorFor(click);
    const nextClick=events.filter(event=>event.eventType==="DAY_PASS_CLICKED"&&event.gymId===click.gymId&&actorFor(event)===clickActor&&event.createdAt>click.createdAt).sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime())[0];
    const outcome = events.find(event => event.gymId === click.gymId && event.createdAt >= click.createdAt && (!nextClick||event.createdAt<nextClick.createdAt) && actorFor(event) === clickActor && ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_CLAIM_DECLINED"].includes(event.eventType));
    const gymConfirmed=events.some(event=>event.eventType==="DAY_PASS_GYM_CONFIRMED"&&event.visitId===`gym-confirm:${click.id}`);
    const userStatus=outcome?.eventType === "DAY_PASS_CLAIM_CONFIRMED" ? "confirmed" : outcome?.eventType === "DAY_PASS_CLAIM_DECLINED" ? "declined" : "unsure";
    return { id: click.id, email: click.user?.email?.toLowerCase() || visitorAccounts.get(click.visitorId) || null, gymId: click.gymId, gym: click.gym!.name, clickedAt: click.createdAt.toISOString(), gymConfirmed, userStatus, status: gymConfirmed ? "confirmed" : userStatus };
  });
  const membershipClickLogs = events.filter(event => event.eventType === "MEMBERSHIP_CLICKED" && event.gymId && event.gym).map(click => {
    const clickActor = actorFor(click);
    const nextClick=events.filter(event=>event.eventType==="MEMBERSHIP_CLICKED"&&event.gymId===click.gymId&&actorFor(event)===clickActor&&event.createdAt>click.createdAt).sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime())[0];
    const outcome = events.find(event => event.gymId === click.gymId && event.createdAt >= click.createdAt && (!nextClick||event.createdAt<nextClick.createdAt) && actorFor(event) === clickActor && ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_CLAIM_DECLINED"].includes(event.eventType));
    const gymConfirmed=events.some(event=>event.eventType==="MEMBERSHIP_GYM_CONFIRMED"&&event.visitId===`gym-confirm:${click.id}`);
    const userStatus=outcome?.eventType === "MEMBERSHIP_CLAIM_CONFIRMED" ? "confirmed" : outcome?.eventType === "MEMBERSHIP_CLAIM_DECLINED" ? "declined" : "unsure";
    return { id: click.id, email: click.user?.email?.toLowerCase() || visitorAccounts.get(click.visitorId) || null, gymId: click.gymId, gym: click.gym!.name, clickedAt: click.createdAt.toISOString(), gymConfirmed, userStatus, status: gymConfirmed ? "confirmed" : userStatus };
  });
  const confirmedClickId=(event:typeof events[number],clickType:"DAY_PASS_CLICKED"|"MEMBERSHIP_CLICKED")=>{const metadata=event.metadata as Record<string,unknown>|null;if(event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string")return metadata.claimClickId;return events.find(click=>click.eventType===clickType&&click.gymId===event.gymId&&actorFor(click)===actorFor(event)&&click.createdAt<=event.createdAt)?.id||event.id};
  const dayPassConfirmationEvents=events.filter(event => ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)),confirmedClaimUsers=new Set(dayPassConfirmationEvents.map(actorFor)),confirmedDayPassKeys=new Set(dayPassConfirmationEvents.map(event=>confirmedClickId(event,"DAY_PASS_CLICKED"))),gymConfirmedDayPassKeys=new Set(events.filter(event=>event.eventType==="DAY_PASS_GYM_CONFIRMED").map(event=>confirmedClickId(event,"DAY_PASS_CLICKED")));
  const uniqueDayPassClickers = new Set(events.filter(event => event.eventType === "DAY_PASS_CLICKED").map(actorFor));
  const uniqueMembershipClickers = new Set(events.filter(event => event.eventType === "MEMBERSHIP_CLICKED").map(actorFor));
  const membershipConfirmationEvents=events.filter(event => ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)),confirmedMembershipUsers=new Set(membershipConfirmationEvents.map(actorFor)),confirmedMembershipKeys=new Set(membershipConfirmationEvents.map(event=>confirmedClickId(event,"MEMBERSHIP_CLICKED"))),gymConfirmedMembershipKeys=new Set(events.filter(event=>event.eventType==="MEMBERSHIP_GYM_CONFIRMED").map(event=>confirmedClickId(event,"MEMBERSHIP_CLICKED")));
  return NextResponse.json({ days, summary: { visitors: visitors.size, visits: visits.size, returningVisits: Math.max(0, visits.size - visitors.size), gymOpens: count("GYM_OPENED"), directionsClicks: count("DIRECTIONS_CLICKED"), favoritesAdded: count("FAVORITE_ADDED"), favoritesRemoved: count("FAVORITE_REMOVED"), comparisons: count("COMPARE_ADDED"), compareViews: count("COMPARE_OPENED"), dayPassClicks: count("DAY_PASS_CLICKED"), uniqueDayPassClickers: uniqueDayPassClickers.size, dayPassClaims: confirmedDayPassKeys.size, gymConfirmedDayPasses: gymConfirmedDayPassKeys.size, uniqueDayPassClaimers: confirmedClaimUsers.size, dayPassSignups: count("DAY_PASS_SIGNUP"), membershipClicks: count("MEMBERSHIP_CLICKED"), uniqueMembershipClickers: uniqueMembershipClickers.size, membershipClaims: confirmedMembershipKeys.size, gymConfirmedMemberships: gymConfirmedMembershipKeys.size, uniqueMembershipClaimers: confirmedMembershipUsers.size, membershipSignups: count("MEMBERSHIP_SIGNUP"), filterUses: count("FILTER_CHANGED"), locationSearches: count("LOCATION_SEARCHED") + count("LOCATION_USED") }, gyms: gymFunnel.sort((a, b) => b.confirmedClaims + b.dayPassClicks + b.signups + b.confirmedMemberships + b.membershipClicks + b.membershipSignups + b.favorites + b.compares + b.opens - (a.confirmedClaims + a.dayPassClicks + a.signups + a.confirmedMemberships + a.membershipClicks + a.membershipSignups + a.favorites + a.compares + a.opens)), conversions, claimClickLogs, membershipClickLogs, filters: filterCategories.map(name => ({ name, uses: filterUsers.get(name)!.size })), userGrowth, trendData, recent: events.slice(0, 100).map(event => ({ ...event, metadata: event.metadata || null })) });
 } catch (error) {
  console.error("Failed to load admin behavior analytics", error);
  return NextResponse.json({ error: "Behavior analytics are temporarily unavailable. Confirm that the latest database migration has been applied, then try again." }, { status: 500 });
 }
}
