ALTER TABLE "Gym"
ADD COLUMN "verificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verificationSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
