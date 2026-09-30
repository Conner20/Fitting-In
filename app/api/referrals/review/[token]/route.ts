import { NextResponse } from "next/server";
import { getConversionReview, type ConversionReviewStatus } from "@/lib/conversion-review";
import { membershipChargeForPeriod, membershipTermsFromMetadata } from "@/lib/membership-attribution";
import { db } from "@/prisma/client";

type Context = { params: Promise<{ token: string }> };
const validStatuses = new Set<ConversionReviewStatus>(["purchased", "not_found"]);

export async function PATCH(req: Request, { params }: Context) {
  const { token } = await params;
  const review = await getConversionReview(token);
  if (!review) return NextResponse.json({ message: "This review link is invalid or has expired." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const decisions: unknown[] = Array.isArray(body.decisions) ? body.decisions : [];
  const pendingRows = review.rows.filter(row => row.status === "check_later");
  const allowedRows = new Map(pendingRows.map(row => [row.id, row]));
  const normalized = decisions
    .map((decision: unknown) => decision as { clickId?: unknown; status?: unknown })
    .filter(decision => typeof decision.clickId === "string" && typeof decision.status === "string" && validStatuses.has(decision.status as ConversionReviewStatus) && allowedRows.has(decision.clickId))
    .map(decision => ({ clickId: decision.clickId as string, status: decision.status as ConversionReviewStatus }));
  if (!normalized.length) return NextResponse.json({ message: "No referral decisions were submitted." }, { status: 400 });
  const submittedIds = new Set(normalized.map(decision => decision.clickId));
  if (submittedIds.size !== pendingRows.length || pendingRows.some(row => !submittedIds.has(row.id))) return NextResponse.json({ message: "Answer yes or no for every unconfirmed referral." }, { status: 400 });
  const sourceClickIds = [...new Set(normalized.map(item => allowedRows.get(item.clickId)!.sourceClickId))];
  const clicks = await db.landingEvent.findMany({ where: { id: { in: sourceClickIds }, gymId: review.gymId }, select: { id: true, eventType: true, visitorId: true, userId: true, metadata: true, createdAt: true } });
  const clickById = new Map(clicks.map(click => [click.id, click]));
  await db.$transaction(async tx => {
    for (const decision of normalized) {
      const row = allowedRows.get(decision.clickId)!;
      const click = clickById.get(row.sourceClickId);
      if (!click || !["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"].includes(click.eventType)) continue;
      if (row.rowKind === "membership_cycle") {
        const eventType = decision.status === "purchased" ? "MEMBERSHIP_CYCLE_GYM_CONFIRMED" : "MEMBERSHIP_GYM_ENDED";
        const clickMetadata = click.metadata as Record<string, unknown> | null;
        const offerId = typeof clickMetadata?.optionId === "string" ? clickMetadata.optionId : null;
        await tx.landingEvent.deleteMany({ where: { visitId: row.id, eventType: { in: ["MEMBERSHIP_CYCLE_GYM_CONFIRMED", "MEMBERSHIP_GYM_ENDED"] } } });
        await tx.landingEvent.create({ data: {
          eventType,
          visitorId: click.visitorId,
          visitId: row.id,
          path: "/referrals/review",
          gymId: review.gymId,
          userId: click.userId,
          metadata: {
            claimClickId: click.id,
            confirmedBy: "gym conversion link",
            confirmedAt: new Date().toISOString(),
            reviewLinkId: review.linkId,
            ...(row.periodIndex !== undefined ? { membershipPeriodIndex: row.periodIndex } : {}),
            ...(row.periodStart ? { membershipPeriodStart: row.periodStart } : {}),
            ...(row.periodEnd ? { membershipPeriodEnd: row.periodEnd } : {}),
            attributedAmount: decision.status === "purchased" ? row.attributedAmount ?? 0 : 0,
            customerEmail: row.email,
            offerId,
            offerName: membershipTermsFromMetadata(click.metadata)?.name || "Membership",
          },
        } });
        continue;
      }

      const membership = click.eventType === "MEMBERSHIP_CLICKED";
      const prefix = membership ? "MEMBERSHIP" : "DAY_PASS";
      const visitId = `gym-confirm:${click.id}`;
      const desiredType = decision.status === "purchased" ? `${prefix}_GYM_CONFIRMED` : `${prefix}_GYM_DECLINED`;
      await tx.landingEvent.deleteMany({ where: { visitId, eventType: { in: [`${prefix}_GYM_CONFIRMED`, `${prefix}_GYM_DECLINED`] } } });
      const clickMetadata = click.metadata as Record<string, unknown> | null;
      const membershipStartDate = membership && decision.status === "purchased" ? click.createdAt.toISOString().slice(0, 10) : null;
      const terms = membershipTermsFromMetadata(clickMetadata);
      const membershipCharge = membershipStartDate && terms ? membershipChargeForPeriod(terms, membershipStartDate, 0) : null;
      const clickPrice = typeof clickMetadata?.price === "number" ? clickMetadata.price : 0;
      await tx.landingEvent.create({ data: {
        eventType: desiredType,
        visitorId: click.visitorId,
        visitId,
        path: "/referrals/review",
        gymId: review.gymId,
        userId: click.userId,
        metadata: {
          claimClickId: click.id,
          confirmedBy: "gym conversion link",
          confirmedAt: new Date().toISOString(),
          reviewLinkId: review.linkId,
          customerEmail: row.email,
          offerId: typeof clickMetadata?.optionId === "string" ? clickMetadata.optionId : null,
          offerName: typeof clickMetadata?.optionName === "string" ? clickMetadata.optionName : typeof clickMetadata?.durationDays === "number" ? `${clickMetadata.durationDays}-day pass` : membership ? "Membership" : "Day pass",
          ...(membershipStartDate ? { membershipStartDate } : {}),
          attributedAmount: decision.status === "purchased" ? membership ? membershipCharge?.total ?? 0 : clickPrice : 0,
          ...(membershipCharge ? { membershipCharge: JSON.parse(JSON.stringify(membershipCharge)) } : {}),
        },
      } });
    }
  });
  return NextResponse.json({ ok: true });
}
