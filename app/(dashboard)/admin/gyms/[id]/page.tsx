import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminGymListingEditor from "@/components/AdminGymListingEditor";
import AdminHeader from "@/components/AdminHeader";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";

export default async function EditGymPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const { id } = await params;

  return (
    <main className="gym-verification-page min-h-screen bg-zinc-50 text-zinc-950 dark:bg-neutral-950 dark:text-white">
      <AdminHeader active="gyms" />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <AdminGymListingEditor gymId={id} />
      </section>
    </main>
  );
}
