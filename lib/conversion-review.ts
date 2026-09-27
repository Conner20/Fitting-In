import { db } from "@/prisma/client";
import { sha256Hex } from "@/lib/token";

export type ConversionReviewStatus = "purchased" | "not_found" | "check_later";

export type ConversionReviewRow = {
  id: string;
  email: string;
  claimType: "Day pass" | "Membership";
  offer: string;
  clickedAt: string;
  status: ConversionReviewStatus;
  confirmedAt?: string;
};

export async function getConversionReview(rawToken: string) {
  const link = await db.gymConversionReviewLink.findFirst({
    where: { tokenHash: sha256Hex(rawToken), expiresAt: { gt: new Date() } },
    select: { id: true, gymId: true, expiresAt: true, gym: { select: { name: true } } },
  });
  if (!link) return null;

  const events = await db.landingEvent.findMany({
    where: {
      gymId: link.gymId,
      eventType: { in: ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED", "DAY_PASS_GYM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED", "DAY_PASS_GYM_DECLINED", "MEMBERSHIP_GYM_DECLINED"] },
    },
    select: { id: true, eventType: true, visitorId: true, visitId: true, metadata: true, createdAt: true, user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
  const clickVisitorIds = [...new Set(events.filter(event => ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"].includes(event.eventType)).map(event => event.visitorId))];
  const identifiedVisitors = clickVisitorIds.length ? await db.landingEvent.findMany({
    where: { visitorId: { in: clickVisitorIds }, userId: { not: null } },
    select: { visitorId: true, user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  }) : [];
  const visitorEmails = new Map(identifiedVisitors.filter(event => event.user?.email).map(event => [event.visitorId, event.user!.email!.toLowerCase()]));
  const outcomes = new Map(events.filter(event => event.eventType.endsWith("_GYM_CONFIRMED") || event.eventType.endsWith("_GYM_DECLINED")).map(event => [event.visitId, event]));
  const candidates = events
    .filter(event => ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"].includes(event.eventType) && (event.user?.email || visitorEmails.has(event.visitorId)))
    .map(event => {
      const membership = event.eventType === "MEMBERSHIP_CLICKED";
      const metadata = event.metadata as Record<string, unknown> | null;
      const optionName = typeof metadata?.optionName === "string" ? metadata.optionName.trim() : "";
      const duration = typeof metadata?.durationDays === "number" ? `${metadata.durationDays}-day pass` : "";
      const price = typeof metadata?.price === "number" ? ` · $${metadata.price.toFixed(2)}${membership ? "/mo" : ""}` : "";
      const gymOutcome = outcomes.get(`gym-confirm:${event.id}`);
      const status: ConversionReviewStatus = gymOutcome?.eventType.endsWith("_GYM_CONFIRMED")
        ? "purchased"
        : gymOutcome?.eventType.endsWith("_GYM_DECLINED")
          ? "not_found"
          : "check_later";
      return {
        id: event.id,
        email: event.user?.email?.toLowerCase() || visitorEmails.get(event.visitorId)!,
        claimType: (membership ? "Membership" : "Day pass") as ConversionReviewRow["claimType"],
        offer: `${optionName || duration || (membership ? "Membership" : "Day pass")}${price}`,
        clickedAt: event.createdAt.toISOString(),
        status,
        confirmedAt: gymOutcome?.createdAt.toISOString(),
        optionKey: typeof metadata?.optionId === "string" && metadata.optionId ? metadata.optionId : optionName || duration || (typeof metadata?.url === "string" ? metadata.url : membership ? "membership" : "day-pass"),
        startsNewAttempt: typeof metadata?.previousClaimClickId === "string",
      };
    });
  const referralAttempts = new Map<string, (typeof candidates)>();
  for (const row of [...candidates].reverse()) {
    const key = `${row.email}:${row.claimType}:${row.optionKey}`;
    const attempts = referralAttempts.get(key) ?? [];
    const current = attempts.at(-1);
    if (!current || current.status !== "check_later" || row.startsNewAttempt) {
      attempts.push(row);
    } else if (current.status === "check_later" && row.status !== "check_later") {
      attempts[attempts.length - 1] = row;
    }
    referralAttempts.set(key, attempts);
  }
  const newerReferralOffers = new Set<string>();
  const rows: ConversionReviewRow[] = [...referralAttempts.values()]
    .flat()
    .sort((a, b) => b.clickedAt.localeCompare(a.clickedAt))
    .filter(row => {
      const key = `${row.email}:${row.claimType}:${row.optionKey}`;
      const hasNewerAttempt = newerReferralOffers.has(key);
      newerReferralOffers.add(key);
      return row.status !== "check_later" || !hasNewerAttempt;
    })
    .slice(0, 1_000)
    .map(({ optionKey: _optionKey, startsNewAttempt: _startsNewAttempt, ...row }) => row);

  return { linkId: link.id, gymId: link.gymId, gymName: link.gym.name, expiresAt: link.expiresAt.toISOString(), rows };
}
