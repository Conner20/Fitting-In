-- Convert every non-gym account to the single trainee role before narrowing the enum.
UPDATE "User"
SET "role" = 'TRAINEE'
WHERE "role" IS NOT NULL
  AND "role" <> 'GYM';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('TRAINEE', 'GYM');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

DROP TYPE "Role_old";
