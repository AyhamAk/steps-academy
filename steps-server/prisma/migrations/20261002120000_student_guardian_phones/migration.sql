-- Parents are linked to their children by phone number instead of an invite
-- code: a child lists every guardian's mobile, and signing in with one of them
-- links that parent.

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "guardianPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Student_guardianPhones_idx" ON "Student" USING GIN ("guardianPhones");

-- Backfill from the single guardianPhone, with the same rules as toE164 in
-- src/utils/phone.ts: digits only, drop a leading 00, 972 or 0, and keep it
-- only if what is left is an Israeli mobile (5 + eight digits). Anything else
-- stays in guardianPhone for an admin to fix by hand.
UPDATE "Student" AS s
SET "guardianPhones" = ARRAY['+972' || n.local]
FROM (
  SELECT id,
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      "guardianPhone", '\D', '', 'g'), '^00', ''), '^972', ''), '^0', '') AS local
  FROM "Student"
  WHERE "guardianPhone" IS NOT NULL
) AS n
WHERE s.id = n.id AND n.local ~ '^5[0-9]{8}$';
