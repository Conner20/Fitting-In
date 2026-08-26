import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminGymManager from "@/components/AdminGymManager";
import AdminNav from "@/components/AdminNav";
import MobileHeader from "@/components/MobileHeader";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";

export default async function AdminGymsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
    return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
        <MobileHeader title="fitting" href="/" />
        <header className="hidden border-b border-black/5 bg-white px-10 py-6 dark:border-white/10 dark:bg-[#050505] lg:block"><Link href="/" aria-label="Return to Fitting In" className="text-[22px] font-black text-[#22c55e]">fitt<span className="underline">in</span>g</Link><div className="mt-4"><AdminNav active="gyms" /></div></header>
        <section className="mx-auto max-w-6xl px-4 py-10"><div className="mb-6"><AdminNav active="gyms" mobile /></div><AdminGymManager /></section>
    </main>;
}
