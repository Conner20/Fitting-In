CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'SUPPORT');

CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "originalFileName" TEXT,
    "originalFileUrl" TEXT,
    "sourceMimeType" TEXT,
    "uploadedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocumentVersion_type_version_key" ON "LegalDocumentVersion"("type", "version");
CREATE INDEX "LegalDocumentVersion_type_isCurrent_idx" ON "LegalDocumentVersion"("type", "isCurrent");
CREATE INDEX "LegalDocumentVersion_type_publishedAt_idx" ON "LegalDocumentVersion"("type", "publishedAt");
