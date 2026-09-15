-- Keep incomplete registrations separate from real users. A User row is now
-- created only after the email verification code has been accepted.
CREATE TABLE "PendingSignup" (
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "gymId" TEXT,
    "intent" TEXT NOT NULL DEFAULT 'day-pass',
    "visitorId" TEXT,
    "visitId" TEXT,
    "clickedAt" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "PendingSignup_expires_idx" ON "PendingSignup"("expires");
