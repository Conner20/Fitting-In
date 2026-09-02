import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { cleanMembershipOptions } from "@/lib/memberships";
import { db } from "@/prisma/client";

export default async function MembershipContinuePage({params,searchParams}:{params:Promise<{gymId:string}>;searchParams:Promise<{optionId?:string}>}) {
  const { gymId } = await params;
  const { optionId } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/log-in?callbackUrl=${encodeURIComponent(`/membership/${gymId}`)}`);
  const gym = await db.gym.findFirst({ where: { id: gymId, isPublished: true }, select: { membershipOptions: true } });
  const options = cleanMembershipOptions(gym?.membershipOptions);
  const selected = optionId ? options.find(option => option.id === optionId) : options.length === 1 ? options[0] : null;
  const destination = selected?.purchaseUrl || options[0]?.purchaseUrl;
  if (!destination) redirect("/");
  redirect(/^https?:\/\//i.test(destination) ? destination : `https://${destination}`);
}
