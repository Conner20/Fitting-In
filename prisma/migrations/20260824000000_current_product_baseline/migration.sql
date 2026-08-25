-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TRAINEE', 'TRAINER', 'GYM');

-- CreateEnum
CREATE TYPE "GymClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "location" TEXT,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role",
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "gymType" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dayPassPrice" DOUBLE PRECISION,
    "dayPassDetails" TEXT,
    "dayPassUrl" TEXT,
    "hours" TEXT,
    "contactEmail" TEXT,
    "coverPhotoUrl" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccess" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClaim" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "status" "GymClaimStatus" NOT NULL DEFAULT 'PENDING',
    "businessRole" TEXT,
    "evidence" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymInvite" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '/',
    "gymId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionCustomFood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "p" DOUBLE PRECISION NOT NULL,
    "c" DOUBLE PRECISION NOT NULL,
    "f" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionCustomFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meal" "MealType" NOT NULL,
    "customFoodId" TEXT,
    "foodName" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "p" DOUBLE PRECISION NOT NULL,
    "c" DOUBLE PRECISION NOT NULL,
    "f" DOUBLE PRECISION NOT NULL,
    "time" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyweightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BodyweightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalKcal" DOUBLE PRECISION NOT NULL DEFAULT 2800,
    "goalProtein" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "goalFat" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "goalCarb" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "heatmapLevels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE INDEX "Gym_name_idx" ON "Gym"("name");

-- CreateIndex
CREATE INDEX "Gym_isPublished_isVerified_idx" ON "Gym"("isPublished", "isVerified");

-- CreateIndex
CREATE INDEX "GymAccess_userId_idx" ON "GymAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccess_gymId_userId_key" ON "GymAccess"("gymId", "userId");

-- CreateIndex
CREATE INDEX "GymClaim_status_createdAt_idx" ON "GymClaim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GymClaim_claimantId_idx" ON "GymClaim"("claimantId");

-- CreateIndex
CREATE UNIQUE INDEX "GymClaim_gymId_claimantId_key" ON "GymClaim"("gymId", "claimantId");

-- CreateIndex
CREATE UNIQUE INDEX "GymInvite_tokenHash_key" ON "GymInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "GymInvite_gymId_expiresAt_idx" ON "GymInvite"("gymId", "expiresAt");

-- CreateIndex
CREATE INDEX "GymFavorite_gymId_idx" ON "GymFavorite"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "GymFavorite_userId_gymId_key" ON "GymFavorite"("userId", "gymId");

-- CreateIndex
CREATE INDEX "LandingEvent_eventType_createdAt_idx" ON "LandingEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "LandingEvent_visitorId_createdAt_idx" ON "LandingEvent"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingEvent_visitId_idx" ON "LandingEvent"("visitId");

-- CreateIndex
CREATE INDEX "LandingEvent_gymId_createdAt_idx" ON "LandingEvent"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingEvent_userId_createdAt_idx" ON "LandingEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NutritionCustomFood_userId_name_idx" ON "NutritionCustomFood"("userId", "name");

-- CreateIndex
CREATE INDEX "NutritionEntry_userId_date_idx" ON "NutritionEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "NutritionEntry_userId_meal_date_idx" ON "NutritionEntry"("userId", "meal", "date");

-- CreateIndex
CREATE INDEX "BodyweightEntry_userId_date_idx" ON "BodyweightEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BodyweightEntry_userId_date_key" ON "BodyweightEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionSettings_userId_key" ON "NutritionSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccess" ADD CONSTRAINT "GymAccess_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccess" ADD CONSTRAINT "GymAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClaim" ADD CONSTRAINT "GymClaim_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClaim" ADD CONSTRAINT "GymClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClaim" ADD CONSTRAINT "GymClaim_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvite" ADD CONSTRAINT "GymInvite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvite" ADD CONSTRAINT "GymInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymFavorite" ADD CONSTRAINT "GymFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymFavorite" ADD CONSTRAINT "GymFavorite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingEvent" ADD CONSTRAINT "LandingEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingEvent" ADD CONSTRAINT "LandingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionCustomFood" ADD CONSTRAINT "NutritionCustomFood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_customFoodId_fkey" FOREIGN KEY ("customFoodId") REFERENCES "NutritionCustomFood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyweightEntry" ADD CONSTRAINT "BodyweightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionSettings" ADD CONSTRAINT "NutritionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent seed for the 15 gym listings required by the current product.
INSERT INTO "Gym" ("id", "name", "slug", "address", "phone", "website", "gymType", "city", "state", "country", "lat", "lng", "equipment", "amenities", "hours", "coverPhotoUrl", "dayPassPrice") VALUES
('landing_balance', 'Balance Gym', 'balance-gym-capitol-hill', '214 D St SE, Washington, DC', '(202) 555-0142', 'balancegym.com', 'Strength-focused', 'Washington', 'DC', 'US', 38.885, -77.003, ARRAY['6 squat racks','4 platforms','Dumbbells to 120 lb','Hack squat'], ARRAY['Sauna','Showers','Turf','Classes'], '5:00 AM – 11:00 PM', '/uploads/messages/1756683355830-1cc96f83-7110-43d2-8fe6-2c691892b156-image.jpeg', 20),
('landing_vida', 'VIDA Fitness', 'vida-fitness-logan-circle', '1517 15th St NW, Washington, DC', '(202) 555-0188', 'vidafitness.com', 'Luxury', 'Washington', 'DC', 'US', 38.910, -77.034, ARRAY['Power racks','Cable stations','Dumbbells to 100 lb'], ARRAY['Pool','Steam room','Sauna','Classes'], '5:00 AM – 12:00 AM', '/uploads/messages/1756683355832-99f24300-9f6f-48be-9342-999463baabb1-gym1.jpeg', 35),
('landing_gold', 'Gold''s Gym', 'golds-gym-van-ness', '4310 Connecticut Ave NW, Washington, DC', '(202) 555-0119', 'goldsgym.com', 'Bodybuilding', 'Washington', 'DC', 'US', 38.946, -77.064, ARRAY['8 squat racks','Leg press','Dumbbells to 150 lb','Smith machines'], ARRAY['Locker rooms','Personal training','Parking'], 'Open 24 hours', '/uploads/messages/1756682653009-425527c2-8dc7-4753-94a2-b82cf5f2a084-image.jpeg', 15),
('landing_dmv', 'DMV Iron Gym', 'dmv-iron-gym-arlington', '2300 Wilson Blvd, Arlington, VA', '(703) 555-0161', 'dmvirongym.com', 'Powerlifting', 'Arlington', 'VA', 'US', 38.890, -77.087, ARRAY['12 power racks','8 platforms','Belt squat','Dumbbells to 150 lb'], ARRAY['24/7','Showers','Turf','Parking'], 'Open 24 hours', '/uploads/messages/1763059689125-163e8549-27a7-4278-9a63-2706878a7b9c-brightly-colored-cartoon-gym-scene-various-exercise-equipment-includes-two-brightly-colored-cartoon-gym-scene-various-370104370.webp', 10),
('landing_planet', 'Planet Fitness', 'planet-fitness-ivy-city', '1406 Okie St NE, Washington, DC', '(202) 555-0190', 'planetfitness.com', 'Budget', 'Washington', 'DC', 'US', 38.915, -76.985, ARRAY['Smith machines','Cable stations','Dumbbells to 75 lb'], ARRAY['Locker rooms','Showers','24/7'], 'Open 24 hours', '/uploads/post-cmhjppfii000m5t5eg5y7xix2-1762829976060-575360b4e5631ff8.webp', 0),
('landing_equinox', 'Equinox Sports Club', 'equinox-sports-club-west-end', '1170 22nd St NW, Washington, DC', '(202) 555-0101', 'equinox.com', 'Luxury', 'Washington', 'DC', 'US', 38.904, -77.049, ARRAY['Power racks','Cable stations'], ARRAY['Pool','Sauna','Classes'], '5:30 AM – 10:00 PM', '/uploads/post-cmhs8pupf00145t5e0eugsu89-1762724826292-8a10023d7e0c6d3c.webp', 45),
('landing_mint', 'MINT Gym & Studio', 'mint-gym-studio-adams-morgan', '1724 California St NW, Washington, DC', '(202) 555-0102', 'mintdc.com', 'General fitness', 'Washington', 'DC', 'US', 38.917, -77.040, ARRAY['Squat racks','Cable stations'], ARRAY['Classes','Showers'], '6:00 AM – 9:00 PM', '/uploads/post-cmhsad5ql006k5t5egn8m0shr-1762728723554-0a301066c3c5086e.webp', 25),
('landing_washington', 'Washington Sports Club', 'washington-sports-club-columbia-heights', '3100 14th St NW, Washington, DC', '(202) 555-0103', 'washingtonsportsclubs.com', 'General fitness', 'Washington', 'DC', 'US', 38.930, -77.033, ARRAY['Smith machines','Leg press'], ARRAY['Classes','Locker rooms'], '5:00 AM – 11:00 PM', '/uploads/post-cmfvsk5fy00025tazcn00kxej-1762571895813-08c3598b00c0227d.jpg', 15),
('landing_onelife', 'Onelife Fitness', 'onelife-fitness-capitol-hill', '300 M St SE, Washington, DC', '(202) 555-0104', 'onelifefitness.com', 'General fitness', 'Washington', 'DC', 'US', 38.876, -77.001, ARRAY['Power racks','Platforms','Leg press'], ARRAY['Turf','Classes','Sauna'], '5:00 AM – 11:00 PM', '/uploads/post-cmhsbv2gp00885t5e9nazqyas-1762730428973-04776a980c21a7bf.jpg', 20),
('landing_crunch', 'Crunch Fitness', 'crunch-fitness-chevy-chase', '5100 Wisconsin Ave NW, Washington, DC', '(202) 555-0105', 'crunch.com', 'Budget', 'Washington', 'DC', 'US', 38.956, -77.083, ARRAY['Squat racks','Cable stations'], ARRAY['Classes','Showers'], '5:00 AM – 11:00 PM', '/uploads/post-cmeeb9nf400145tvf7cuyazuu-1762569723011-47285446a112688b.jpg', 10),
('landing_crossfit', 'CrossFit DC', 'crossfit-dc-u-street', '1507 U St NW, Washington, DC', '(202) 555-0106', 'crossfitdc.com', 'CrossFit', 'Washington', 'DC', 'US', 38.917, -77.035, ARRAY['Platforms','Power racks'], ARRAY['Classes','Turf'], '5:30 AM – 8:30 PM', '/uploads/post-cmg5qej8s000o5tusz74zk4sj-1762572393804-1e21620a48fd7cfa.webp', 25),
('landing_sportfit', 'Sport&Health', 'sport-health-bethesda', '4400 Montgomery Ave, Bethesda, MD', '(301) 555-0107', 'sportandhealth.com', 'General fitness', 'Bethesda', 'MD', 'US', 38.984, -77.091, ARRAY['Squat racks','Dumbbells to 100 lb'], ARRAY['Pool','Sauna','Parking'], '5:00 AM – 10:00 PM', '/uploads/post-cmhs93uma002g5t5erea4byu4-1762725457377-938cb19c363e4e10.jpg', 20),
('landing_orangetheory', 'Orangetheory Fitness', 'orangetheory-fitness-navy-yard', '82 I St SE, Washington, DC', '(202) 555-0108', 'orangetheory.com', 'General fitness', 'Washington', 'DC', 'US', 38.879, -77.006, ARRAY['Dumbbells','Rowers'], ARRAY['Classes','Showers'], '5:00 AM – 9:00 PM', '/uploads/post-cme95366p000a5ty36p2j3jnn-1756333210492-2532c391f2637847.jpg', 0),
('landing_xl', 'The St. James Performance Club', 'st-james-performance-club', '6805 Industrial Rd, Springfield, VA', '(703) 555-0109', 'thestjames.com', 'Luxury', 'Springfield', 'VA', 'US', 38.771, -77.177, ARRAY['Power racks','Platforms','Dumbbells to 150 lb'], ARRAY['Pool','Basketball','Turf'], '5:00 AM – 11:00 PM', '/uploads/post-cmhrxwkdx00825t5ecpp5r4an-1762706760759-fdfbed8cb63f78b8.webp', 40),
('landing_urban', 'Urban Athletic Club', 'urban-athletic-club-shaw', '804 N St NW, Washington, DC', '(202) 555-0110', 'urbanathletic.club', 'Strength-focused', 'Washington', 'DC', 'US', 38.907, -77.023, ARRAY['Power racks','Platforms','Belt squat'], ARRAY['Classes','Turf','Showers'], '6:00 AM – 9:00 PM', '/uploads/post-cmhsbeisn007c5t5eeb9ct9a5-1762729592064-922c57d913a7a134.jpg', 18)
ON CONFLICT ("slug") DO NOTHING;

