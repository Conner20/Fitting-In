CREATE TABLE "FavoriteUser" (
    "id" TEXT NOT NULL,
    "favoriterId" TEXT NOT NULL,
    "favoritedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FavoriteUser_favoriterId_favoritedId_key" ON "FavoriteUser"("favoriterId", "favoritedId");
CREATE INDEX "FavoriteUser_favoriterId_createdAt_idx" ON "FavoriteUser"("favoriterId", "createdAt");
CREATE INDEX "FavoriteUser_favoritedId_createdAt_idx" ON "FavoriteUser"("favoritedId", "createdAt");

ALTER TABLE "FavoriteUser"
ADD CONSTRAINT "FavoriteUser_favoriterId_fkey"
FOREIGN KEY ("favoriterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FavoriteUser"
ADD CONSTRAINT "FavoriteUser_favoritedId_fkey"
FOREIGN KEY ("favoritedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
