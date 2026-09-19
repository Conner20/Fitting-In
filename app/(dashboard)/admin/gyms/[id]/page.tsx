import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminGymListingEditor from "@/components/AdminGymListingEditor";
import AdminHeader from "@/components/AdminHeader";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export default async function EditGymPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const { id } = await params;
  const gym = await db.gym.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!gym) redirect("/admin/gyms");

  return (
    <main className="gym-verification-page min-h-screen bg-zinc-50 text-zinc-950 dark:bg-neutral-950 dark:text-white">
      <AdminHeader active="gyms" />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mx-auto mb-6 max-w-4xl border-b border-black/10 pb-4 dark:border-white/10">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{gym.name}</h1>
        </div>
        <AdminGymListingEditor gymId={id} />
      </section>
    </main>
  );
}
