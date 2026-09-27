import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminBehaviorDashboard from "@/components/AdminBehaviorDashboard";
import AdminHeader from "@/components/AdminHeader";
import AdminMetricCard from "@/components/AdminMetricCard";
import AdminUserManager from "@/components/AdminUserManager";
import AdminGymVerificationLog from "@/components/AdminGymVerificationLog";
import AdminMetricsActions from "@/components/AdminMetricsActions";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const requestedRange = (await searchParams).range ?? "all";
  const range = ["week", "month", "year", "all"].includes(requestedRange) ? requestedRange : "all";
  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : range === "year" ? 365 : 0;
  const since = rangeDays ? new Date(Date.now() - rangeDays * 86_400_000) : null;
  const createdAt = since ? { createdAt: { gte: since } } : {};
  const [users, gymUsers, visitEvents, dayPassClicks, dayPassConfirmationEvents, membershipClicks, membershipConfirmationEvents, dayPassSignups, membershipSignups, attributionClicks] = await Promise.all([
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, ...createdAt } }),
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, role: "GYM", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: "VISIT", ...createdAt }, select: { userId: true, visitorId: true, visitId: true } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"] }, ...createdAt }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"] }, ...createdAt }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_SIGNUP", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_SIGNUP", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"] } }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50_000 }),
  ]);
  const actor = (event: { userId: string | null; visitorId: string }) => event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`;
  const confirmationKey = (event: typeof dayPassConfirmationEvents[number] | typeof membershipConfirmationEvents[number], clickType: "DAY_PASS_CLICKED" | "MEMBERSHIP_CLICKED") => { const metadata=event.metadata as Record<string,unknown>|null;if(event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string")return metadata.claimClickId;return attributionClicks.find(click=>click.eventType===clickType&&click.gymId===event.gymId&&actor(click)===actor(event)&&click.createdAt<=event.createdAt)?.id||event.id };
  const confirmedDayPasses = new Set(dayPassConfirmationEvents.map(event=>confirmationKey(event,"DAY_PASS_CLICKED"))).size;
  const confirmedDayPassesByGym = new Set(dayPassConfirmationEvents.filter(event => event.eventType === "DAY_PASS_GYM_CONFIRMED").map(event=>confirmationKey(event,"DAY_PASS_CLICKED"))).size;
  const confirmedMemberships = new Set(membershipConfirmationEvents.map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED"))).size;
  const confirmedMembershipsByGym = new Set(membershipConfirmationEvents.filter(event => event.eventType === "MEMBERSHIP_GYM_CONFIRMED").map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED"))).size;
  const visitors = new Set(visitEvents.map(actor)).size;
  const visits = new Set(visitEvents.map(event => event.visitId)).size;
  const verificationLog = await db.gym.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, updatedAt: true,
      access: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true, assignedByEmail: true, user: { select: { email: true } } } },
    },
  });
  const verificationLogRows = verificationLog.map(gym => {
    const claim = gym.access[0] ?? null;
    const claimantEmail = claim?.user.email ?? null;
    return { id: gym.id, name: gym.name, isClaimed: Boolean(claim), claimedBy: claimantEmail ?? "—", claimedAt: claim?.createdAt.toISOString() ?? null, updatedAt: gym.updatedAt.toISOString() };
  });
  const cards: readonly (readonly [string, number | string, string?])[] = [
    ["Total Users / Gym Users", `${users.toLocaleString()} / ${gymUsers.toLocaleString()}`],
    ["Visitors / Visits", `${visitors.toLocaleString()} / ${visits.toLocaleString()}`],
    ["Day-pass Clicks / Confirms / Gym Confirms", `${dayPassClicks.toLocaleString()} / ${confirmedDayPasses.toLocaleString()} / ${confirmedDayPassesByGym.toLocaleString()}`],
    ["Membership Clicks / Confirms / Gym Confirms", `${membershipClicks.toLocaleString()} / ${confirmedMemberships.toLocaleString()} / ${confirmedMembershipsByGym.toLocaleString()}`],
    ["Day-pass Signups / Membership Signups", `${dayPassSignups.toLocaleString()} / ${membershipSignups.toLocaleString()}`],
  ];
  return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
    <AdminHeader active="overview" />
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="admin-overview-period-row flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">Overview period</p><div className="admin-overview-period-options flex flex-wrap gap-2">{[["week","Past week","1W"],["month","Past month","1M"],["year","Past year","1Y"],["all","All time","ALL"]].map(([value,label,shortLabel])=><Link key={value} href={`/admin?range=${value}`} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${range===value?"border-[#22c55e] bg-[#22c55e] text-black":"border-black/10 hover:border-[#22c55e] dark:border-white/15"}`}><span className="md:hidden">{shortLabel}</span><span className="hidden md:inline">{label}</span></Link>)}</div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label,value,breakdown])=><AdminMetricCard key={label} label={label} value={value} breakdown={breakdown}/>)}</div>
      <section id="users" className="space-y-4"><div><h2 className="text-xl font-black">Users</h2></div><AdminUserManager /></section>
      <section id="gym-verification-log" className="space-y-4 border-t border-black/10 pt-8 dark:border-white/10">
        <h2 className="text-xl font-black">Gym claim log</h2>
        <AdminGymVerificationLog rows={verificationLogRows} />
      </section>
      <section id="behavior" className="admin-overview-behavior border-t border-black/10 pt-8 dark:border-white/10"><AdminBehaviorDashboard compact periodDays={rangeDays} /></section>
      <div className="flex justify-center border-t border-black/10 pt-8 dark:border-white/10"><AdminMetricsActions /></div>
    </section>
  </main>;
}
