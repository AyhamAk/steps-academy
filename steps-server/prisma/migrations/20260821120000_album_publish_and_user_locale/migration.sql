-- Publishing an album is now an explicit step, so families are told once when
-- the admin is finished rather than on every photo request.
-- Backfilled to createdAt: every album that already exists has been notified
-- about under the old behaviour, and must not be announced a second time.
ALTER TABLE "Event" ADD COLUMN "notifiedAt" TIMESTAMP(3);
UPDATE "Event" SET "notifiedAt" = "createdAt";

-- The language to write push copy in. Null falls back to English.
ALTER TABLE "User" ADD COLUMN "locale" TEXT;
