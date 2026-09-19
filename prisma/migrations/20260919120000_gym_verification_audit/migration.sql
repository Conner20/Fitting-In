ALTER TABLE "Gym"
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verifiedByEmail" TEXT;

UPDATE "Gym"
SET "verifiedAt" = "updatedAt"
WHERE "isVerified" = true AND "verifiedAt" IS NULL;
