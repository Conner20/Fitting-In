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

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [users, newUsers, gyms, published, dayPassClicks, dayPassSignups] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.gym.count(),
    db.gym.count({ where: { isPublished: true } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", createdAt: { gte: since } } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_SIGNUP", createdAt: { gte: since } } }),
  ]);
  const cards = [["Accounts", users], ["New · 30d", newUsers], ["Gyms", gyms], ["Published", published], ["Day-pass clicks · 30d", dayPassClicks], ["Signup conversions · 30d", dayPassSignups]] as const;
  return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
    <MobileHeader title="fitting" href="/" />
    <header className="hidden border-b border-black/5 bg-white px-10 py-6 dark:border-white/10 dark:bg-[#050505] lg:block"><Link href="/" aria-label="Return to Fitting In" className="text-[22px] font-black text-[#22c55e]">fitt<span className="underline">in</span>g</Link><div className="mt-4"><AdminNav active="overview" /></div></header>
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="lg:hidden"><AdminNav active="overview" mobile /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{cards.map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString()}</p></div>)}</div>
      <section id="users" className="space-y-4"><div><h2 className="text-xl font-black">Users</h2><p className="text-sm text-zinc-500">Search accounts, review gym access, manage administrators, or delete accounts.</p></div><AdminUserManager /></section>
      <section id="behavior" className="border-t border-black/10 pt-8 dark:border-white/10"><AdminBehaviorDashboard compact /></section>
    </section>
  </main>;
}
