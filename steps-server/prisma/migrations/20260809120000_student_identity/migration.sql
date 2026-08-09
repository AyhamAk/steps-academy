-- Student identity migration.
--
-- Photo visibility used to be decided by comparing free-text strings:
-- User.childNames (typed by the parent) against PhotoTag.studentName. Any two
-- children sharing a name meant both families saw each other's photos. This
-- replaces that with real Student records and FK-backed links.
--
-- Existing rows are preserved: one Student is created per distinct name
-- (case-insensitively), and the old string columns are rewritten to point at
-- it before they are dropped.

-- 1. New tables -------------------------------------------------------------

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Student_name_idx" ON "Student"("name");

CREATE TABLE "ParentStudent" (
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("parentId","studentId")
);
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

CREATE TABLE "EventAttendee" (
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("eventId","studentId")
);
CREATE INDEX "EventAttendee_studentId_idx" ON "EventAttendee"("studentId");

-- 2. Backfill Student from every name currently in use -----------------------
-- Grouped case-insensitively so "Layla" and "layla" become one student, which
-- is how the old matching behaved.

INSERT INTO "Student" ("id", "name", "createdAt")
SELECT gen_random_uuid(), MIN(n), CURRENT_TIMESTAMP
FROM (
    SELECT TRIM("studentName") AS n FROM "PhotoTag"
    UNION ALL
    SELECT TRIM(a) FROM "Event" CROSS JOIN LATERAL unnest("attendees") AS a
    UNION ALL
    SELECT TRIM(c) FROM "User" CROSS JOIN LATERAL unnest("childNames") AS c
) AS names
WHERE n IS NOT NULL AND n <> ''
GROUP BY LOWER(n);

-- 3. Rewrite PhotoTag to reference a Student ---------------------------------

ALTER TABLE "PhotoTag" ADD COLUMN "studentId" TEXT;

UPDATE "PhotoTag" pt
SET "studentId" = s."id"
FROM "Student" s
WHERE LOWER(TRIM(pt."studentName")) = LOWER(s."name");

-- Tags whose name was blank/unmatchable have no student to point at.
DELETE FROM "PhotoTag" WHERE "studentId" IS NULL;

-- Case-variant duplicates on the same photo collapse into one row under the
-- new unique constraint, so drop the extras first.
DELETE FROM "PhotoTag" a
USING "PhotoTag" b
WHERE a."photoId" = b."photoId"
  AND a."studentId" = b."studentId"
  AND a."id" > b."id";

ALTER TABLE "PhotoTag" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "PhotoTag" DROP COLUMN "studentName";

CREATE UNIQUE INDEX "PhotoTag_photoId_studentId_key" ON "PhotoTag"("photoId","studentId");
CREATE INDEX "PhotoTag_studentId_idx" ON "PhotoTag"("studentId");

-- 4. Backfill EventAttendee from Event.attendees -----------------------------

INSERT INTO "EventAttendee" ("eventId", "studentId")
SELECT DISTINCT e."id", s."id"
FROM "Event" e
CROSS JOIN LATERAL unnest(e."attendees") AS a(name)
JOIN "Student" s ON LOWER(s."name") = LOWER(TRIM(a.name))
WHERE TRIM(a.name) <> '';

ALTER TABLE "Event" DROP COLUMN "attendees";

-- 5. Backfill ParentStudent from User.childNames -----------------------------

INSERT INTO "ParentStudent" ("parentId", "studentId", "createdAt")
SELECT DISTINCT u."id", s."id", CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN LATERAL unnest(u."childNames") AS c(name)
JOIN "Student" s ON LOWER(s."name") = LOWER(TRIM(c.name))
WHERE TRIM(c.name) <> '';

ALTER TABLE "User" DROP COLUMN "childNames";

-- 6. Foreign keys ------------------------------------------------------------

ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhotoTag" ADD CONSTRAINT "PhotoTag_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Indexes flagged by the scale audit --------------------------------------

CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
