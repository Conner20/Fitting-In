import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import MobileHeader from "@/components/MobileHeader";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export default async function MetricsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const since = new Date(Date.now() - 30 * 86400000);
  const [users, newUsers, gyms, published, accounts] = await Promise.all([
    db.user.count(), db.user.count({ where: { createdAt: { gte: since } } }), db.gym.count(), db.gym.count({ where: { isPublished: true } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, lastLoginAt: true } }),
  ]);
  let dayPassClicks = 0;
  let dayPassSignups = 0;
  try {
    [dayPassClicks, dayPassSignups] = await Promise.all([
      db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", createdAt: { gte: since } } }),
      db.landingEvent.count({ where: { eventType: "DAY_PASS_SIGNUP", createdAt: { gte: since } } }),
    ]);
  } catch { /* Analytics storage may be pending migration; core account metrics still render. */ }
  const cards = [["Total accounts", users], ["New accounts · 30d", newUsers], ["Gym listings", gyms], ["Published gyms", published], ["Day-pass clicks · 30d", dayPassClicks], ["Signups after day pass · 30d", dayPassSignups]] as const;
  return <main className="min-h-screen bg-[#f8f8f8] dark:bg-[#050505] dark:text-white">
    <MobileHeader title="admin metrics" href="/admin/metrics" />
    <header className="hidden border-b border-black/5 bg-white px-10 py-6 dark:border-white/10 dark:bg-[#050505] lg:block"><p className="text-sm uppercase tracking-wide text-zinc-500">Admin console</p><h1 className="text-3xl font-bold">Platform metrics</h1><div className="mt-4"><AdminNav active="metrics" /></div></header>
    <section className="mx-auto max-w-6xl px-4 py-10"><div className="mb-6 lg:hidden"><AdminNav active="metrics" mobile /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString()}</p></div>)}</div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5"><div className="border-b border-black/10 p-5 dark:border-white/10"><h2 className="text-xl font-black">Signed-up users</h2><p className="text-sm text-zinc-500">{accounts.length} most recent accounts</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-zinc-50 text-zinc-500 dark:bg-black/20"><tr><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Type</th><th className="p-4">Signed up</th><th className="p-4">Last login</th></tr></thead><tbody>{accounts.map(user=><tr key={user.id} className="border-t border-black/5 dark:border-white/10"><td className="p-4 font-semibold">{user.name || user.username || "Unnamed user"}</td><td className="p-4 text-zinc-500">{user.email || "—"}</td><td className="p-4">{user.role === "GYM" ? "Gym" : "Visitor"}</td><td className="p-4">{user.createdAt.toLocaleDateString()}</td><td className="p-4">{user.lastLoginAt?.toLocaleDateString() || "Never"}</td></tr>)}</tbody></table></div></div>
    </section>
  </main>;
}

