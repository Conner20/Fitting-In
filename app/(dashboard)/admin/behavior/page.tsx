import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminBehaviorDashboard from "@/components/AdminBehaviorDashboard";
import AdminNav from "@/components/AdminNav";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";

export default async function BehaviorPage(){const session=await getServerSession(authOptions);if(!session?.user?.email||!(await hasAdminAccessByEmail(session.user.email)))redirect("/");return <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-[#050505] dark:text-white"><header className="border-b border-black/5 bg-white px-4 py-6 dark:border-white/10 dark:bg-[#050505] lg:px-10"><p className="text-sm uppercase tracking-wide text-zinc-500">Admin console</p><h1 className="text-3xl font-bold">User behavior</h1><div className="mt-4"><AdminNav active="behavior"/></div></header><section className="mx-auto max-w-7xl px-4 py-10"><AdminBehaviorDashboard/></section></main>}
