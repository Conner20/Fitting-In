import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import ChangePasswordClient from "./ChangePasswordClient";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/log-in?callbackUrl=%2Fchange-password");

  return <ChangePasswordClient />;
}
