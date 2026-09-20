import type { LegalDocumentType, Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/prisma/client";
import { PRIVACY_UPDATED_AT, TERMS_UPDATED_AT } from "@/lib/legal-updates";

export type LegalBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets" | "numbered"; items: string[] }
  | { type: "document"; html: string };

export const LEGAL_TITLES: Record<LegalDocumentType, string> = {
  TERMS: "Terms of Use",
  PRIVACY: "Privacy Policy",
  SUPPORT: "Contact Us",
};

export async function getPublishedLegalDocument(type: LegalDocumentType) {
  noStore();
  return db.legalDocumentVersion.findFirst({ where: { type, isCurrent: true }, orderBy: { publishedAt: "desc" } }).catch(error => {
    if (error instanceof Error && (error.message.includes("LegalDocumentVersion") || error.message.includes("P2021"))) return null;
    throw error;
  });
}

export async function getCurrentLegalDates() {
  const current = await db.legalDocumentVersion.findMany({
    where: { type: { in: ["TERMS", "PRIVACY"] }, isCurrent: true },
    select: { type: true, publishedAt: true },
  }).catch(error => {
    if (error instanceof Error && (error.message.includes("LegalDocumentVersion") || error.message.includes("P2021"))) return [];
    throw error;
  });
  const byType = new Map(current.map(item => [item.type, item.publishedAt]));
  return {
    terms: byType.get("TERMS") ?? new Date(TERMS_UPDATED_AT),
    privacy: byType.get("PRIVACY") ?? new Date(PRIVACY_UPDATED_AT),
  };
}

export function legalBlocks(value: Prisma.JsonValue): LegalBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter((block): block is LegalBlock => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return false;
    const item = block as Record<string, unknown>;
    if (item.type === "heading" || item.type === "paragraph") return typeof item.text === "string";
    if (item.type === "document") return typeof item.html === "string";
    return (item.type === "bullets" || item.type === "numbered") && Array.isArray(item.items) && item.items.every(v => typeof v === "string");
  });
}

export function formatLegalDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(date);
}
