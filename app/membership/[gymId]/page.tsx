import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { cleanMembershipOptions, lowestMembershipOption } from "@/lib/memberships";
import { db } from "@/prisma/client";

export default async function MembershipContinuePage({params}:{params:Promise<{gymId:string}>}) {
  const { gymId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/log-in?callbackUrl=${encodeURIComponent(`/membership/${gymId}`)}`);
  const gym = await db.gym.findFirst({ where: { id: gymId, isPublished: true }, select: { membershipOptions: true } });
  const destination = lowestMembershipOption(cleanMembershipOptions(gym?.membershipOptions))?.purchaseUrl;
  if (!destination) redirect("/");
  redirect(/^https?:\/\//i.test(destination) ? destination : `https://${destination}`);
}
