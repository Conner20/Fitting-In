import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminGymManager from "@/components/AdminGymManager";
import AdminNav from "@/components/AdminNav";
import MobileHeader from "@/components/MobileHeader";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";

export default async function AdminGymsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
    return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
        <MobileHeader title="manage gyms" href="/admin/gyms" />
        <header className="hidden border-b border-black/5 bg-white px-10 py-6 dark:border-white/10 dark:bg-[#050505] lg:block"><p className="text-sm uppercase tracking-wide text-zinc-500">Admin console</p><h1 className="text-3xl font-bold">Manage gyms</h1><div className="mt-4"><AdminNav active="gyms" /></div></header>
        <section className="mx-auto max-w-6xl px-4 py-10"><div className="mb-6"><AdminNav active="gyms" mobile /></div><AdminGymManager /></section>
    </main>;
}
