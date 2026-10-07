-- Every activity belongs to one of the nursery day's slots, and the activity's
-- own name becomes optional: a slot like reception often has nothing more
-- specific to say.
CREATE TYPE "ScheduleSlot" AS ENUM ('reception', 'breakfast', 'prepAndFreeChoice', 'dailyActivity', 'storyOrCircle', 'lunch', 'napTime');

ALTER TABLE "ScheduleActivity" ADD COLUMN "slot" "ScheduleSlot";
ALTER TABLE "ScheduleActivity" ALTER COLUMN "name" DROP NOT NULL;

-- Rows whose name is only a time range ("7:30-9:00") used the name as a
-- placeholder. The range is the real time; the name goes.
UPDATE "ScheduleActivity" AS a
SET "startTime" = to_char(r.m[1]::time, 'HH24:MI'),
    "durationMinutes" = (EXTRACT(EPOCH FROM (r.m[2]::time - r.m[1]::time)) / 60)::int,
    "name" = NULL
FROM (
  SELECT id, regexp_match("name", '^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$') AS m
  FROM "ScheduleActivity"
) AS r
WHERE a.id = r.id AND r.m IS NOT NULL AND r.m[2]::time > r.m[1]::time;

UPDATE "ScheduleActivity" SET "slot" = 'lunch' WHERE "name" LIKE '%غداء%';

-- Everything else by when it starts, using the academy's default day.
UPDATE "ScheduleActivity" SET "slot" = CASE
  WHEN "startTime" < '09:00' THEN 'reception'::"ScheduleSlot"
  WHEN "startTime" < '09:30' THEN 'breakfast'::"ScheduleSlot"
  WHEN "startTime" < '10:00' THEN 'prepAndFreeChoice'::"ScheduleSlot"
  WHEN "startTime" < '11:15' THEN 'dailyActivity'::"ScheduleSlot"
  WHEN "startTime" < '12:15' THEN 'storyOrCircle'::"ScheduleSlot"
  ELSE 'napTime'::"ScheduleSlot"
END
WHERE "slot" IS NULL;

ALTER TABLE "ScheduleActivity" ALTER COLUMN "slot" SET NOT NULL;
