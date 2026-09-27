import { NextResponse } from "next/server";
import { getConversionReview, type ConversionReviewStatus } from "@/lib/conversion-review";
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

  const clickIds = normalized.map(item => item.clickId);
  const clicks = await db.landingEvent.findMany({ where: { id: { in: clickIds }, gymId: review.gymId }, select: { id: true, eventType: true, visitorId: true, userId: true } });
  const clickById = new Map(clicks.map(click => [click.id, click]));
  await db.$transaction(async tx => {
    for (const decision of normalized) {
      const click = clickById.get(decision.clickId);
      if (!click || !["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"].includes(click.eventType)) continue;
      const prefix = click.eventType === "MEMBERSHIP_CLICKED" ? "MEMBERSHIP" : "DAY_PASS";
      const visitId = `gym-confirm:${click.id}`;
      const desiredType = decision.status === "purchased" ? `${prefix}_GYM_CONFIRMED` : decision.status === "not_found" ? `${prefix}_GYM_DECLINED` : null;
      const existing = await tx.landingEvent.findFirst({ where: { visitId, eventType: { in: [`${prefix}_GYM_CONFIRMED`, `${prefix}_GYM_DECLINED`] } }, select: { eventType: true } });
      if (existing?.eventType === desiredType || (!existing && !desiredType)) continue;
      await tx.landingEvent.deleteMany({ where: { visitId, eventType: { in: [`${prefix}_GYM_CONFIRMED`, `${prefix}_GYM_DECLINED`] } } });
      if (desiredType) await tx.landingEvent.create({ data: { eventType: desiredType, visitorId: click.visitorId, visitId, path: "/referrals/review", gymId: review.gymId, userId: click.userId, metadata: { claimClickId: click.id, confirmedBy: "gym conversion link", confirmedAt: new Date().toISOString(), reviewLinkId: review.linkId } } });
    }
  });
  return NextResponse.json({ ok: true });
}
