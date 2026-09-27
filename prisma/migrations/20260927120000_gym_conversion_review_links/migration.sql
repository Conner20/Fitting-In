CREATE TABLE "GymConversionReviewLink" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymConversionReviewLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymConversionReviewLink_gymId_key" ON "GymConversionReviewLink"("gymId");
CREATE UNIQUE INDEX "GymConversionReviewLink_tokenHash_key" ON "GymConversionReviewLink"("tokenHash");
CREATE INDEX "GymConversionReviewLink_expiresAt_idx" ON "GymConversionReviewLink"("expiresAt");

ALTER TABLE "GymConversionReviewLink" ADD CONSTRAINT "GymConversionReviewLink_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
