import LandingHeader from "@/components/LandingHeader";
import LegalTabs from "@/components/LegalTabs";
import LegalDocumentContent from "@/components/LegalDocumentContent";
import { formatLegalDate, getPublishedLegalDocument, legalBlocks } from "@/lib/legal-documents";
import type { LegalDocumentType } from "@prisma/client";

const titleTypes: Record<string, LegalDocumentType> = { "Terms of Use": "TERMS", "Privacy Policy": "PRIVACY" };

export default async function PolicyPage({ title, children, lastUpdated = "August 23, 2026" }: { title: string; intro: string; children: React.ReactNode; lastUpdated?: string }) {
  const type = titleTypes[title];
  const published = type ? await getPublishedLegalDocument(type) : null;
  const displayedTitle = published?.title ?? title;
  const displayedDate = published?.publishedAt ? formatLegalDate(published.publishedAt) : lastUpdated;
  const displayedContent = published ? <LegalDocumentContent blocks={legalBlocks(published.content)} /> : children;
  return <div className="min-h-screen bg-[#070907] text-white"><LandingHeader/><LegalTabs/><main className="px-4 py-9 sm:py-14"><div className="mx-auto max-w-3xl space-y-7"><header className="space-y-3 border-b border-white/10 pb-7"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{displayedTitle}</h1><p className="text-xs text-white/40">Last updated {displayedDate}</p></header><article className="space-y-8 rounded-2xl border border-white/10 bg-[#111411]/90 p-5 text-sm leading-7 text-white/70 sm:rounded-3xl sm:p-8 [&_a]:break-words [&_a]:text-[#22c55e] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-white [&_section+section]:border-t [&_section+section]:border-white/[.08] [&_section+section]:pt-7 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{displayedContent}</article></div></main></div>;
}
