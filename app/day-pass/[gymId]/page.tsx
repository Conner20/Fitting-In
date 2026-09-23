import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/prisma/client";
import { cleanDayPassOptions } from "@/lib/day-passes";

export default async function DayPassContinuePage({params,searchParams}:{params:Promise<{gymId:string}>;searchParams:Promise<{optionId?:string}>}) {
  const { gymId } = await params;
  const { optionId } = await searchParams;
  const session = await getServerSession(authOptions);
  const callback = `/day-pass/${gymId}${optionId ? `?optionId=${encodeURIComponent(optionId)}` : ""}`;
  if (!session?.user) redirect(`/log-in?callbackUrl=${encodeURIComponent(callback)}`);
  const gym = await db.gym.findFirst({ where: { id: gymId, isPublished: true }, select: { dayPassOptions: true, dayPassUrl: true, website: true } });
  const options = cleanDayPassOptions(gym?.dayPassOptions);
  const selected = optionId ? options.find(option => option.id === optionId) : options.length === 1 ? options[0] : null;
  const destination = selected?.purchaseUrl || options[0]?.purchaseUrl || gym?.dayPassUrl || gym?.website;
  if (!destination) redirect("/");
  redirect(/^https?:\/\//i.test(destination) ? destination : `https://${destination}`);
}
