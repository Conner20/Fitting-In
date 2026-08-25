-- Reset only Prisma migration bookkeeping after an intentional schema replacement.
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    DELETE FROM "_prisma_migrations";
  END IF;
END $$;

