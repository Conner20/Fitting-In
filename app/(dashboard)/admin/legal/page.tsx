import AdminHeader from "@/components/AdminHeader";
import AdminLegalManager from "@/components/AdminLegalManager";
import { db } from "@/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  const versions = await db.legalDocumentVersion.findMany({ where: { publishedAt: { not: null } }, orderBy: [{ type: "asc" }, { version: "desc" }] });
  return <main className="min-h-screen bg-[#050505] text-white"><AdminHeader active="legal"/><section className="mx-auto max-w-7xl px-4 py-10"><AdminLegalManager initialVersions={JSON.parse(JSON.stringify(versions))}/></section></main>;
}
