import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GymConversionReview from "@/components/GymConversionReview";
import { getConversionReview } from "@/lib/conversion-review";

export const metadata: Metadata = { title: "Confirm referrals", robots: { index: false, follow: false } };

export default async function ReferralReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const review = await getConversionReview(token);
  if (!review) notFound();
  return <GymConversionReview token={token} gymName={review.gymName} expiresAt={review.expiresAt} initialRows={review.rows} />;
}
