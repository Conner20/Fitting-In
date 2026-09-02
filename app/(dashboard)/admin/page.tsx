import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminBehaviorDashboard from "@/components/AdminBehaviorDashboard";
import AdminUserManager from "@/components/AdminUserManager";
import AdminNav from "@/components/AdminNav";
import MobileHeader from "@/components/MobileHeader";
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
  const [users, gymUsers, dayPassClicks, confirmedDayPasses, membershipClicks, confirmedMemberships, demandEvents] = await Promise.all([
    db.user.count({ where: createdAt }),
    db.user.count({ where: { role: "GYM", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLAIM_CONFIRMED", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_CLICKED", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_CLAIM_CONFIRMED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["GYM_OPENED", "DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"] }, ...createdAt }, select: { eventType: true, userId: true, visitorId: true } }),
  ]);
  const actor = (event: { userId: string | null; visitorId: string }) => event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`;
  const listingViewers = new Set(demandEvents.filter(event => event.eventType === "GYM_OPENED").map(actor));
  const dayPassClickers = new Set(demandEvents.filter(event => event.eventType === "DAY_PASS_CLICKED").map(actor));
  const dayPassClickRate = listingViewers.size ? `${(dayPassClickers.size / listingViewers.size * 100).toFixed(1)}%` : "0.0%";
  const membershipClickers = new Set(demandEvents.filter(event => event.eventType === "MEMBERSHIP_CLICKED").map(actor));
  const membershipClickRate = listingViewers.size ? `${(membershipClickers.size / listingViewers.size * 100).toFixed(1)}%` : "0.0%";
  const cards: readonly (readonly [string, number | string])[] = [["Users", users], ["Gym Users", gymUsers], ["Day-pass clicks", dayPassClicks], ["Confirmed day passes", confirmedDayPasses], ["Day-pass click rate", dayPassClickRate], ["Membership clicks", membershipClicks], ["Confirmed memberships", confirmedMemberships], ["Membership click rate", membershipClickRate]];
  return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
    <MobileHeader title="fitting" href="/" />
    <header className="hidden border-b border-black/5 bg-white px-10 py-6 dark:border-white/10 dark:bg-[#050505] lg:block"><Link href="/" aria-label="Return to Fitting In" className="text-[22px] font-black text-[#22c55e]">fitt<span className="underline">in</span>g</Link><div className="mt-4"><AdminNav active="overview" /></div></header>
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="lg:hidden"><AdminNav active="overview" mobile /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">Overview period</p><div className="flex flex-wrap gap-2">{[["week","Past week"],["month","Past month"],["year","Past year"],["all","All time"]].map(([value,label])=><Link key={value} href={`/admin?range=${value}`} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${range===value?"border-[#22c55e] bg-[#22c55e] text-black":"border-black/10 hover:border-[#22c55e] dark:border-white/15"}`}>{label}</Link>)}</div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{typeof value==="number"?value.toLocaleString():value}</p></div>)}</div>
      <section id="users" className="space-y-4"><div><h2 className="text-xl font-black">Users</h2></div><AdminUserManager /></section>
      <section id="behavior" className="admin-overview-behavior border-t border-black/10 pt-8 dark:border-white/10"><AdminBehaviorDashboard compact periodDays={rangeDays} /></section>
    </section>
  </main>;
}
