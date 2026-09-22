-- Claiming and verification are now one action. Normalize existing listings so
-- GymAccess is the source of truth for whether a listing is claimed/verified.
UPDATE "Gym" AS gym
SET
    "isVerified" = false,
    "verifiedAt" = NULL,
    "verifiedByEmail" = NULL
WHERE NOT EXISTS (
    SELECT 1 FROM "GymAccess" AS access WHERE access."gymId" = gym.id
);

UPDATE "Gym" AS gym
SET
    "isVerified" = true,
    "verifiedAt" = COALESCE(
        (SELECT MIN(access."createdAt") FROM "GymAccess" AS access WHERE access."gymId" = gym.id),
        gym."verifiedAt",
        NOW()
    ),
    "verifiedByEmail" = (
        SELECT account.email
        FROM "GymAccess" AS access
        JOIN "User" AS account ON account.id = access."userId"
        WHERE access."gymId" = gym.id
        ORDER BY access."createdAt" ASC
        LIMIT 1
    )
WHERE EXISTS (
    SELECT 1 FROM "GymAccess" AS access WHERE access."gymId" = gym.id
);

UPDATE "User" AS account
SET role = 'TRAINEE'
WHERE account.role = 'GYM'
  AND NOT EXISTS (
      SELECT 1 FROM "GymAccess" AS access WHERE access."userId" = account.id
  );

UPDATE "User" AS account
SET role = 'GYM'
WHERE EXISTS (
    SELECT 1 FROM "GymAccess" AS access WHERE access."userId" = account.id
);
