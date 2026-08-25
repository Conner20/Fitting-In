import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";

export default async function DayPassContinuePage({params}:{params:Promise<{gymId:string}>}) {
  const { gymId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/log-in?callbackUrl=${encodeURIComponent(`/day-pass/${gymId}`)}`);
  const gym = await db.gym.findFirst({ where: { id: gymId, isPublished: true }, select: { website: true } });
  if (!gym?.website) redirect("/");
  redirect(/^https?:\/\//i.test(gym.website) ? gym.website : `https://${gym.website}`);
}
