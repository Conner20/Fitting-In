import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import AdminGymManager from "@/components/AdminGymManager";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";

export default async function AdminGymsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
    return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
        <AdminHeader active="gyms" />
        <section className="mx-auto max-w-6xl px-4 py-10"><AdminGymManager /></section>
    </main>;
}
