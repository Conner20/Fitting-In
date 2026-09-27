ALTER TABLE "LandingEvent" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "LandingEvent_dedupeKey_key" ON "LandingEvent"("dedupeKey");
