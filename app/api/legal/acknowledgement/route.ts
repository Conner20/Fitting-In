import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCurrentLegalDates } from "@/lib/legal-documents";
import { db } from "@/prisma/client";

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return db.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, createdAt: true, termsAcceptedAt: true, privacyAcceptedAt: true },
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ required: null });
  const { terms: termsUpdatedAt, privacy: privacyUpdatedAt } = await getCurrentLegalDates();

  // Accounts created after a policy update accepted the current policies in
  // the sign-up flow. Older accounts must explicitly acknowledge the update.
  const termsRequired = user.createdAt < termsUpdatedAt && (!user.termsAcceptedAt || user.termsAcceptedAt < termsUpdatedAt);
  const privacyRequired = user.createdAt < privacyUpdatedAt && (!user.privacyAcceptedAt || user.privacyAcceptedAt < privacyUpdatedAt);
  const required = termsRequired && privacyRequired ? "both" : termsRequired ? "terms" : privacyRequired ? "privacy" : null;
  return NextResponse.json({ required });
}

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { terms: termsUpdatedAt, privacy: privacyUpdatedAt } = await getCurrentLegalDates();
  await db.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: termsUpdatedAt, privacyAcceptedAt: privacyUpdatedAt },
  });
  return NextResponse.json({ ok: true });
}
