import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { LegalDocumentType, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { LEGAL_TITLES } from "@/lib/legal-documents";
import { parseLegalFile } from "@/lib/legal-document-parser";
import { storeImageFile } from "@/lib/storage";
import { db } from "@/prisma/client";

const TYPES = new Set<LegalDocumentType>(["TERMS", "PRIVACY"]);

async function adminEmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  return email && await hasAdminAccessByEmail(email) ? email : null;
}

export async function GET() {
  if (!await adminEmail()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const versions = await db.legalDocumentVersion.findMany({ where: { publishedAt: { not: null } }, orderBy: [{ type: "asc" }, { version: "desc" }] });
  return NextResponse.json({ versions });
}

export async function POST(request: Request) {
  const email = await adminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const type = String(form.get("type") || "") as LegalDocumentType;
    const action = String(form.get("action") || "preview");
    if (!(file instanceof File) || !TYPES.has(type)) return NextResponse.json({ error: "Choose a document and legal-page type." }, { status: 400 });
    const parsed = await parseLegalFile(file, LEGAL_TITLES[type]);
    if (action !== "publish") {
      return NextResponse.json({ preview: { type, title: parsed.title, content: parsed.blocks, originalFileName: file.name } });
    }
    const latest = await db.legalDocumentVersion.aggregate({ where: { type }, _max: { version: true } });
    const nextVersion = (latest._max.version ?? 0) + 1;
    const stored = await storeImageFile(file, { folder: "legal", prefix: `${type.toLowerCase()}-v${nextVersion}` });
    const publishedAt = new Date();
    const [, version] = await db.$transaction([
      db.legalDocumentVersion.updateMany({ where: { type, isCurrent: true }, data: { isCurrent: false } }),
      db.legalDocumentVersion.create({ data: {
        type,
        title: parsed.title,
        content: parsed.blocks as unknown as Prisma.InputJsonValue,
        version: nextVersion,
        isCurrent: true,
        originalFileName: file.name,
        originalFileUrl: stored.url,
        sourceMimeType: file.type || null,
        uploadedByEmail: email,
        publishedAt,
      } }),
    ]);
    return NextResponse.json({ version });
  } catch (error) {
    console.error("[admin-legal-upload]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process this document." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!await adminEmail()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing document version." }, { status: 400 });
  const version = await db.legalDocumentVersion.findUnique({ where: { id: body.id } });
  if (!version?.publishedAt) return NextResponse.json({ error: "Published document version not found." }, { status: 404 });
  const publishedAt = new Date();
  await db.$transaction([
    db.legalDocumentVersion.updateMany({ where: { type: version.type, isCurrent: true }, data: { isCurrent: false } }),
    db.legalDocumentVersion.update({ where: { id: version.id }, data: { isCurrent: true, publishedAt } }),
  ]);
  return NextResponse.json({ ok: true, publishedAt });
}
