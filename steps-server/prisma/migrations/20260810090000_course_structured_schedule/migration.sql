-- Course schedules were free text ("Sundays & Wednesdays"), which can't be
-- translated, sorted, or turned into real dates. Replace with structured
-- weekdays plus a start time, keeping the calendar range that already existed.

ALTER TABLE "Course" ADD COLUMN "weekDays" "WeekDay"[] DEFAULT ARRAY[]::"WeekDay"[];
ALTER TABLE "Course" ADD COLUMN "startTime" TEXT;

-- Backfill from the English day names the existing rows happen to use, so no
-- course silently loses its schedule.
UPDATE "Course" SET "weekDays" = (
  SELECT COALESCE(ARRAY_AGG(d ORDER BY idx), ARRAY[]::"WeekDay"[])
  FROM (
    VALUES ('sun'::"WeekDay", 1, 'sun'), ('mon'::"WeekDay", 2, 'mon'), ('tue'::"WeekDay", 3, 'tue'),
           ('wed'::"WeekDay", 4, 'wed'), ('thu'::"WeekDay", 5, 'thu')
  ) AS days(d, idx, needle)
  WHERE "Course"."schedule" ILIKE '%' || days.needle || '%'
)
WHERE "schedule" IS NOT NULL;

ALTER TABLE "Course" DROP COLUMN "schedule";
