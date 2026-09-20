import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const day = (date: Date) => date.toISOString().slice(0, 10);
const actor = (event: { userId: string | null; visitorId: string }) => event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`;

function formatSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, sheet.columnCount) } };
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FF000000" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } }; });
  sheet.columns.forEach(column => { let width = String(column.header || "").length + 2; column.eachCell?.({ includeEmpty: false }, cell => { width = Math.min(45, Math.max(width, String(cell.value ?? "").length + 2)); }); column.width = Math.max(12, width); });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [events, users, gyms, latestReset] = await Promise.all([
    db.landingEvent.findMany({ where: { eventType: { not: "METRICS_RESET" } }, select: { id: true, eventType: true, visitorId: true, visitId: true, path: true, gymId: true, userId: true, metadata: true, durationMs: true, createdAt: true, gym: { select: { name: true } }, user: { select: { email: true } } }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { emailVerified: { not: null } }, select: { id: true, email: true, role: true, isAdmin: true, createdAt: true, emailVerified: true, lastLoginAt: true, gymAccesses: { select: { gym: { select: { name: true } } } } }, orderBy: { createdAt: "asc" } }),
    db.gym.findMany({ select: { id: true, name: true, contactEmail: true, isVerified: true, verifiedAt: true, verifiedByEmail: true, createdAt: true, updatedAt: true, access: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true, assignedByEmail: true, user: { select: { email: true } } } } }, orderBy: { name: "asc" } }),
    db.landingEvent.findFirst({ where: { eventType: "METRICS_RESET" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Fitting In"; workbook.created = new Date(); workbook.modified = new Date();
  const eventTypes = [...new Set(events.map(event => event.eventType))].sort();
  const visitors = new Set(events.map(event => event.visitorId));
  const visits = new Set(events.map(event => event.visitId));

  const summary = workbook.addWorksheet("Overview");
  summary.columns = [{ header: "Metric", key: "metric" }, { header: "Value", key: "value" }];
  summary.addRows([
    { metric: "Export generated", value: new Date().toISOString() }, { metric: "Verified users", value: users.length }, { metric: "Gym users", value: users.filter(user => user.role === "GYM").length },
    { metric: "Gyms", value: gyms.length }, { metric: "Verified gyms", value: gyms.filter(gym => gym.isVerified).length }, { metric: "Unique visitors", value: visitors.size }, { metric: "Visits", value: visits.size },
    ...eventTypes.map(type => ({ metric: type, value: events.filter(event => event.eventType === type).length })),
  ]); formatSheet(summary);

  const coverage = workbook.addWorksheet("Audit notes");
  coverage.columns = [{ header: "Item", key: "item" }, { header: "Value", key: "value" }];
  coverage.addRows([
    { item: "Export generated", value: new Date().toISOString() },
    { item: "Metrics history begins", value: latestReset?.createdAt.toISOString() ?? "Earliest retained record" },
    { item: "Daily reporting timezone", value: "UTC" },
    { item: "Raw behavior records included", value: "Yes — see Raw events" },
    { item: "Historical gym verification changes", value: "Only the current verification, ownership, and last-updated timestamps are retained by the database." },
    { item: "Historical account role changes", value: "Only the current role is retained by the database." },
  ]);
  formatSheet(coverage);

  type ExportEvent = (typeof events)[number];
  type DailyRow = { visitors: Set<string>; visits: Set<string>; users: number; gymUsers: number; gyms: number; events: Map<string, number>; actors: Map<string, Set<string>>; sourceEvents: ExportEvent[]; durationMs: number };
  const emptyDailyRow = (): DailyRow => ({ visitors: new Set(), visits: new Set(), users: 0, gymUsers: 0, gyms: 0, events: new Map(), actors: new Map(), sourceEvents: [], durationMs: 0 });
  const dailyMap = new Map<string, DailyRow>();
  const getDailyRow = (date: string) => { const existing = dailyMap.get(date); if (existing) return existing; const created = emptyDailyRow(); dailyMap.set(date, created); return created; };
  const resetAt = latestReset?.createdAt ?? null;
  for (const user of users) { if (resetAt && user.createdAt < resetAt) continue; const row = getDailyRow(day(user.createdAt)); row.users++; if (user.role === "GYM") row.gymUsers++; }
  for (const gym of gyms) { if (resetAt && gym.createdAt < resetAt) continue; getDailyRow(day(gym.createdAt)).gyms++; }
  for (const event of events) {
    const row = getDailyRow(day(event.createdAt)), eventActor = actor(event);
    row.visitors.add(event.visitorId); row.visits.add(event.visitId); row.sourceEvents.push(event); row.durationMs += event.durationMs ?? 0;
    row.events.set(event.eventType, (row.events.get(event.eventType) ?? 0) + 1);
    const actors = row.actors.get(event.eventType) ?? new Set<string>(); actors.add(eventActor); row.actors.set(event.eventType, actors);
  }
  const recordedDates = [...users.map(user => user.createdAt), ...gyms.map(gym => gym.createdAt), ...events.map(event => event.createdAt)];
  const today = day(new Date()), firstRecordedDay = latestReset ? day(latestReset.createdAt) : recordedDates.length ? day(new Date(Math.min(...recordedDates.map(date => date.getTime())))) : today;
  for (let cursor = new Date(`${firstRecordedDay}T00:00:00.000Z`), end = new Date(`${today}T00:00:00.000Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) getDailyRow(day(cursor));
  const daily = workbook.addWorksheet("Daily metrics");
  daily.columns = [
    { header: "Date", key: "date" }, { header: "New users", key: "users" }, { header: "Total users", key: "totalUsers" }, { header: "New gym users", key: "gymUsers" }, { header: "Total gym users", key: "totalGymUsers" }, { header: "New gyms", key: "gyms" }, { header: "Total gyms", key: "totalGyms" },
    { header: "Unique visitors", key: "visitors" }, { header: "Visits", key: "visits" }, { header: "Returning visits", key: "returningVisits" }, { header: "Time spent (minutes)", key: "timeSpent" }, { header: "Gym profile opens", key: "gymOpens" }, { header: "Directions clicks", key: "directions" }, { header: "Website clicks", key: "website" }, { header: "Favorites added", key: "favoritesAdded" }, { header: "Favorites removed", key: "favoritesRemoved" }, { header: "Gyms added to comparison", key: "comparisons" }, { header: "Comparison views", key: "compareViews" },
    { header: "Day-pass clicks", key: "dayPassClicks" }, { header: "Unique day-pass clickers", key: "uniqueDayPassClickers" }, { header: "Confirmed day passes", key: "confirmedDayPasses" }, { header: "User-confirmed day passes", key: "userConfirmedDayPasses" }, { header: "Day passes confirmed by gym", key: "gymConfirmedDayPasses" }, { header: "Unique users who got a day pass", key: "uniqueDayPassClaimers" }, { header: "Day-pass signups", key: "dayPassSignups" }, { header: "Day-pass click rate", key: "dayPassClickRate" },
    { header: "Membership clicks", key: "membershipClicks" }, { header: "Unique membership clickers", key: "uniqueMembershipClickers" }, { header: "Confirmed memberships", key: "confirmedMemberships" }, { header: "User-confirmed memberships", key: "userConfirmedMemberships" }, { header: "Memberships confirmed by gym", key: "gymConfirmedMemberships" }, { header: "Unique users who got a membership", key: "uniqueMembershipClaimers" }, { header: "Membership signups", key: "membershipSignups" }, { header: "Membership click rate", key: "membershipClickRate" }, { header: "Filter uses", key: "filterUses" }, { header: "Location searches", key: "locationSearches" },
    ...eventTypes.map(type => ({ header: `Raw event: ${type}`, key: `raw:${type}` })),
  ];
  const eventCount = (row: DailyRow, type: string) => row.events.get(type) ?? 0;
  const uniqueActors = (row: DailyRow, types: string[]) => new Set(types.flatMap(type => [...(row.actors.get(type) ?? [])]));
  const confirmedClickId = (event: ExportEvent, clickType: "DAY_PASS_CLICKED" | "MEMBERSHIP_CLICKED") => {
    const metadata = event.metadata as Record<string, unknown> | null;
    if (event.eventType.endsWith("_GYM_CONFIRMED") && typeof metadata?.claimClickId === "string") return metadata.claimClickId;
    return [...events].reverse().find(click => click.eventType === clickType && click.gymId === event.gymId && actor(click) === actor(event) && click.createdAt <= event.createdAt)?.id ?? event.id;
  };
  let totalUsers = resetAt ? users.filter(user => user.createdAt < resetAt).length : 0;
  let totalGymUsers = resetAt ? users.filter(user => user.createdAt < resetAt && user.role === "GYM").length : 0;
  let totalGyms = resetAt ? gyms.filter(gym => gym.createdAt < resetAt).length : 0;
  for (const [date, row] of [...dailyMap].sort(([a], [b]) => a.localeCompare(b))) {
    totalUsers += row.users; totalGymUsers += row.gymUsers; totalGyms += row.gyms;
    const profileViewers = uniqueActors(row, ["GYM_OPENED"]), dayPassClickers = uniqueActors(row, ["DAY_PASS_CLICKED"]), membershipClickers = uniqueActors(row, ["MEMBERSHIP_CLICKED"]);
    const confirmedDayPasses = new Set(row.sourceEvents.filter(event => ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)).map(event => confirmedClickId(event, "DAY_PASS_CLICKED"))).size;
    const confirmedMemberships = new Set(row.sourceEvents.filter(event => ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)).map(event => confirmedClickId(event, "MEMBERSHIP_CLICKED"))).size;
    daily.addRow({
      date, users: row.users, totalUsers, gymUsers: row.gymUsers, totalGymUsers, gyms: row.gyms, totalGyms, visitors: row.visitors.size, visits: row.visits.size, returningVisits: Math.max(0, row.visits.size - row.visitors.size), timeSpent: Number((row.durationMs / 60_000).toFixed(2)), gymOpens: eventCount(row, "GYM_OPENED"), directions: eventCount(row, "DIRECTIONS_CLICKED"), website: eventCount(row, "WEBSITE_CLICKED"), favoritesAdded: eventCount(row, "FAVORITE_ADDED"), favoritesRemoved: eventCount(row, "FAVORITE_REMOVED"), comparisons: eventCount(row, "COMPARE_ADDED"), compareViews: eventCount(row, "COMPARE_OPENED"),
      dayPassClicks: eventCount(row, "DAY_PASS_CLICKED"), uniqueDayPassClickers: dayPassClickers.size, confirmedDayPasses, userConfirmedDayPasses: eventCount(row, "DAY_PASS_CLAIM_CONFIRMED"), gymConfirmedDayPasses: eventCount(row, "DAY_PASS_GYM_CONFIRMED"), uniqueDayPassClaimers: uniqueActors(row, ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"]).size, dayPassSignups: eventCount(row, "DAY_PASS_SIGNUP"), dayPassClickRate: profileViewers.size ? Number((dayPassClickers.size / profileViewers.size * 100).toFixed(1)) : 0,
      membershipClicks: eventCount(row, "MEMBERSHIP_CLICKED"), uniqueMembershipClickers: membershipClickers.size, confirmedMemberships, userConfirmedMemberships: eventCount(row, "MEMBERSHIP_CLAIM_CONFIRMED"), gymConfirmedMemberships: eventCount(row, "MEMBERSHIP_GYM_CONFIRMED"), uniqueMembershipClaimers: uniqueActors(row, ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"]).size, membershipSignups: eventCount(row, "MEMBERSHIP_SIGNUP"), membershipClickRate: profileViewers.size ? Number((membershipClickers.size / profileViewers.size * 100).toFixed(1)) : 0, filterUses: eventCount(row, "FILTER_CHANGED"), locationSearches: eventCount(row, "LOCATION_SEARCHED") + eventCount(row, "LOCATION_USED"),
      ...Object.fromEntries(eventTypes.map(type => [`raw:${type}`, eventCount(row, type)])),
    });
  }
  formatSheet(daily);

  const rawEvents = workbook.addWorksheet("Raw events");
  rawEvents.columns = ["Event ID", "Date", "Timestamp", "Event type", "User email", "User ID", "Visitor ID", "Visit ID", "Gym", "Gym ID", "Path", "Duration ms", "Metadata"].map(header => ({ header, key: header }));
  for (const event of events) rawEvents.addRow({
    "Event ID": event.id, Date: day(event.createdAt), Timestamp: event.createdAt.toISOString(), "Event type": event.eventType, "User email": event.user?.email ?? "", "User ID": event.userId ?? "", "Visitor ID": event.visitorId, "Visit ID": event.visitId, Gym: event.gym?.name ?? "", "Gym ID": event.gymId ?? "", Path: event.path, "Duration ms": event.durationMs ?? "", Metadata: event.metadata == null ? "" : JSON.stringify(event.metadata),
  });
  formatSheet(rawEvents);

  const byUser = new Map(users.map(user => [user.id, { dayClicks: 0, dayConfirms: 0, memberClicks: 0, memberConfirms: 0 }]));
  for (const event of events) if (event.userId && byUser.has(event.userId)) { const row = byUser.get(event.userId)!; if (event.eventType === "DAY_PASS_CLICKED") row.dayClicks++; if (["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)) row.dayConfirms++; if (event.eventType === "MEMBERSHIP_CLICKED") row.memberClicks++; if (["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)) row.memberConfirms++; }
  const userSheet = workbook.addWorksheet("Users");
  userSheet.columns = ["Email", "Role", "Admin", "Gym", "Created", "Email verified", "Last active", "Day-pass clicks", "Day-pass confirms", "Membership clicks", "Membership confirms"].map(header => ({ header, key: header }));
  for (const user of users) { const metrics = byUser.get(user.id)!; userSheet.addRow({ Email: user.email ?? "", Role: user.role ?? "", Admin: user.isAdmin ? "Yes" : "No", Gym: user.gymAccesses.map(access => access.gym.name).join(", "), Created: user.createdAt.toISOString(), "Email verified": user.emailVerified?.toISOString() ?? "", "Last active": user.lastLoginAt?.toISOString() ?? "", "Day-pass clicks": metrics.dayClicks, "Day-pass confirms": metrics.dayConfirms, "Membership clicks": metrics.memberClicks, "Membership confirms": metrics.memberConfirms }); }
  formatSheet(userSheet);

  const gymEventTypes = ["GYM_OPENED", "FAVORITE_ADDED", "COMPARE_ADDED", "DIRECTIONS_CLICKED", "WEBSITE_CLICKED", "DAY_PASS_CLICKED", "DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED", "DAY_PASS_SIGNUP", "MEMBERSHIP_CLICKED", "MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED", "MEMBERSHIP_SIGNUP"];
  const gymSheet = workbook.addWorksheet("Gym demand");
  gymSheet.columns = [{ header: "Gym", key: "Gym" }, ...gymEventTypes.map(type => ({ header: type, key: type }))];
  for (const gym of gyms) { const gymEvents = events.filter(event => event.gymId === gym.id); gymSheet.addRow({ Gym: gym.name, ...Object.fromEntries(gymEventTypes.map(type => [type, new Set(gymEvents.filter(event => event.eventType === type).map(actor)).size])) }); }
  formatSheet(gymSheet);

  const dailyGymSheet = workbook.addWorksheet("Daily gym demand");
  dailyGymSheet.columns = [{ header: "Date", key: "Date" }, { header: "Gym", key: "Gym" }, { header: "Gym ID", key: "Gym ID" }, ...gymEventTypes.flatMap(type => [{ header: `${type} events`, key: `${type}:events` }, { header: `${type} unique users`, key: `${type}:users` }])];
  const retainedDates = [...dailyMap.keys()].sort();
  for (const date of retainedDates) for (const gym of gyms) {
    const gymEvents = dailyMap.get(date)!.sourceEvents.filter(event => event.gymId === gym.id);
    dailyGymSheet.addRow({ Date: date, Gym: gym.name, "Gym ID": gym.id, ...Object.fromEntries(gymEventTypes.flatMap(type => [[`${type}:events`, gymEvents.filter(event => event.eventType === type).length], [`${type}:users`, new Set(gymEvents.filter(event => event.eventType === type).map(actor)).size]])) });
  }
  formatSheet(dailyGymSheet);

  const claimSheet = workbook.addWorksheet("Claim activity");
  claimSheet.columns = ["Type", "Email", "Gym", "Clicked at", "User confirmation", "Gym confirmation"].map(header => ({ header, key: header }));
  for (const click of events.filter(event => ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"].includes(event.eventType))) { const prefix = click.eventType === "DAY_PASS_CLICKED" ? "DAY_PASS" : "MEMBERSHIP"; const related = events.filter(event => event.gymId === click.gymId && actor(event) === actor(click) && event.createdAt >= click.createdAt); claimSheet.addRow({ Type: prefix === "DAY_PASS" ? "Day pass" : "Membership", Email: click.user?.email ?? "", Gym: click.gym?.name ?? "Deleted gym", "Clicked at": click.createdAt.toISOString(), "User confirmation": related.some(event => event.eventType === `${prefix}_CLAIM_CONFIRMED`) ? "Confirmed" : related.some(event => event.eventType === `${prefix}_CLAIM_DECLINED`) ? "Declined" : "Unknown", "Gym confirmation": related.some(event => event.eventType === `${prefix}_GYM_CONFIRMED`) ? "Confirmed" : "Not confirmed" }); }
  formatSheet(claimSheet);

  const filterSheet = workbook.addWorksheet("Filter usage");
  filterSheet.columns = [{ header: "Filter category", key: "category" }, { header: "Unique users", key: "users" }];
  const categories = ["Distance", "Day-pass price", "Membership price", "Gym type", "Equipment", "Amenities"];
  const matchesFilterCategory = (event: ExportEvent, category: string) => event.eventType === "FILTER_CHANGED" && JSON.stringify(event.metadata ?? {}).toLowerCase().includes(category.toLowerCase().replace("gym type", ""));
  for (const category of categories) { const actors = new Set(events.filter(event => matchesFilterCategory(event, category)).map(actor)); filterSheet.addRow({ category, users: actors.size }); }
  formatSheet(filterSheet);

  const dailyFilters = workbook.addWorksheet("Daily filter usage");
  dailyFilters.columns = [{ header: "Date", key: "date" }, { header: "Filter category", key: "category" }, { header: "Uses", key: "uses" }, { header: "Unique users", key: "users" }];
  for (const date of retainedDates) for (const category of categories) { const matching = dailyMap.get(date)!.sourceEvents.filter(event => matchesFilterCategory(event, category)); dailyFilters.addRow({ date, category, uses: matching.length, users: new Set(matching.map(actor)).size }); }
  formatSheet(dailyFilters);

  const citySheet = workbook.addWorksheet("Popular cities");
  citySheet.columns = [{ header: "City", key: "city" }, { header: "State", key: "state" }, { header: "Country", key: "country" }, { header: "Unique users", key: "users" }];
  const cities = new Map<string, { city: string; state: string; country: string; users: Set<string> }>();
  for (const event of events.filter(event => ["LOCATION_SEARCHED", "LOCATION_USED"].includes(event.eventType))) { const data = event.metadata as Record<string, unknown> | null; const city = typeof data?.city === "string" ? data.city.trim() : ""; if (!city) continue; const state = typeof data?.state === "string" ? data.state.trim() : ""; const country = typeof data?.country === "string" ? data.country.trim() : ""; const key = `${city.toLowerCase()}|${state.toLowerCase()}|${country.toLowerCase()}`; const row = cities.get(key) ?? { city, state, country, users: new Set() }; row.users.add(actor(event)); cities.set(key, row); }
  for (const row of [...cities.values()].sort((a, b) => b.users.size - a.users.size)) citySheet.addRow({ city: row.city, state: row.state, country: row.country, users: row.users.size });
  formatSheet(citySheet);

  const dailyCities = workbook.addWorksheet("Daily city activity");
  dailyCities.columns = [{ header: "Date", key: "date" }, { header: "City", key: "city" }, { header: "State", key: "state" }, { header: "Country", key: "country" }, { header: "Searches / location uses", key: "uses" }, { header: "Unique users", key: "users" }];
  const dailyCityRows = new Map<string, { date: string; city: string; state: string; country: string; uses: number; users: Set<string> }>();
  for (const event of events.filter(event => ["LOCATION_SEARCHED", "LOCATION_USED"].includes(event.eventType))) {
    const data = event.metadata as Record<string, unknown> | null, city = typeof data?.city === "string" ? data.city.trim() : ""; if (!city) continue;
    const date = day(event.createdAt), state = typeof data?.state === "string" ? data.state.trim() : "", country = typeof data?.country === "string" ? data.country.trim() : "", key = `${date}|${city.toLowerCase()}|${state.toLowerCase()}|${country.toLowerCase()}`;
    const row = dailyCityRows.get(key) ?? { date, city, state, country, uses: 0, users: new Set<string>() }; row.uses++; row.users.add(actor(event)); dailyCityRows.set(key, row);
  }
  for (const row of [...dailyCityRows.values()].sort((a, b) => a.date.localeCompare(b.date) || b.users.size - a.users.size)) dailyCities.addRow({ date: row.date, city: row.city, state: row.state, country: row.country, uses: row.uses, users: row.users.size });
  formatSheet(dailyCities);

  const verification = workbook.addWorksheet("Gym verification");
  verification.columns = ["Gym", "Verified", "Verified by", "Verified at", "Claimed by", "Claimed at", "Assigned by", "Last updated"].map(header => ({ header, key: header }));
  for (const gym of gyms) { const access = gym.access[0]; verification.addRow({ Gym: gym.name, Verified: gym.isVerified ? "Yes" : "No", "Verified by": gym.verifiedByEmail ?? "", "Verified at": gym.verifiedAt?.toISOString() ?? "", "Claimed by": access?.user.email ?? "", "Claimed at": access?.createdAt.toISOString() ?? "", "Assigned by": access?.assignedByEmail ?? "", "Last updated": gym.updatedAt.toISOString() }); }
  formatSheet(verification);

  const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const sections = workbook.worksheets.map(sheet => {
    const rows: string[] = [`${csvCell("Section")},${csvCell(sheet.name)}`];
    sheet.eachRow({ includeEmpty: true }, row => {
      const values = Array.from({ length: sheet.columnCount }, (_, index) => row.getCell(index + 1).value);
      rows.push(values.map(csvCell).join(","));
    });
    return rows.join("\r\n");
  });
  const csv = `\uFEFF${sections.join("\r\n\r\n")}`;
  const filename = `fitting-in-metrics-${day(new Date())}.csv`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
