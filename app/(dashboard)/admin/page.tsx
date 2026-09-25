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
  const [users, gymUsers, dayPassClicks, dayPassConfirmationEvents, membershipClicks, membershipConfirmationEvents, demandEvents] = await Promise.all([
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, ...createdAt } }),
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, role: "GYM", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED"] }, ...createdAt }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED"] }, ...createdAt }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["GYM_OPENED", "DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"] }, ...createdAt }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, createdAt: true } }),
  ]);
  const actor = (event: { userId: string | null; visitorId: string }) => event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`;
  const confirmationKey = (event: typeof dayPassConfirmationEvents[number] | typeof membershipConfirmationEvents[number], clickType: "DAY_PASS_CLICKED" | "MEMBERSHIP_CLICKED") => { const metadata=event.metadata as Record<string,unknown>|null;if(event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string")return metadata.claimClickId;return demandEvents.filter(click=>click.eventType===clickType&&click.gymId===event.gymId&&actor(click)===actor(event)&&click.createdAt<=event.createdAt).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())[0]?.id||event.id };
  const confirmedDayPasses = new Set(dayPassConfirmationEvents.map(event=>confirmationKey(event,"DAY_PASS_CLICKED"))).size;
  const confirmedDayPassesByGym = new Set(dayPassConfirmationEvents.filter(event => event.eventType === "DAY_PASS_GYM_CONFIRMED").map(event=>confirmationKey(event,"DAY_PASS_CLICKED"))).size;
  const confirmedMemberships = new Set(membershipConfirmationEvents.map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED"))).size;
  const confirmedMembershipsByGym = new Set(membershipConfirmationEvents.filter(event => event.eventType === "MEMBERSHIP_GYM_CONFIRMED").map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED"))).size;
  const listingViewers = new Set(demandEvents.filter(event => event.eventType === "GYM_OPENED").map(actor));
  const dayPassClickers = new Set(demandEvents.filter(event => event.eventType === "DAY_PASS_CLICKED").map(actor));
  const dayPassClickRate = listingViewers.size ? `${(dayPassClickers.size / listingViewers.size * 100).toFixed(1)}%` : "0.0%";
  const membershipClickers = new Set(demandEvents.filter(event => event.eventType === "MEMBERSHIP_CLICKED").map(actor));
  const membershipClickRate = listingViewers.size ? `${(membershipClickers.size / listingViewers.size * 100).toFixed(1)}%` : "0.0%";
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
    ["Users", users], ["Gym Users", gymUsers], ["Day-pass clicks", dayPassClicks], ["Confirmed day passes", confirmedDayPasses], ["Confirmed day passes by gym", confirmedDayPassesByGym],
    ["Day-pass click rate", dayPassClickRate, `${dayPassClickers.size.toLocaleString()} unique Claim Day Pass clickers ÷ ${listingViewers.size.toLocaleString()} unique gym-profile viewers × 100 = ${dayPassClickRate}`],
    ["Membership clicks", membershipClicks], ["Confirmed memberships", confirmedMemberships], ["Confirmed memberships by gym", confirmedMembershipsByGym],
    ["Membership click rate", membershipClickRate, `${membershipClickers.size.toLocaleString()} unique Claim Membership clickers ÷ ${listingViewers.size.toLocaleString()} unique gym-profile viewers × 100 = ${membershipClickRate}`],
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
