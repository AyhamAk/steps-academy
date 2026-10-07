-- Every nursery day is the same seven slots at the same times. The slot is the
-- title; what happens in it that day is the description underneath.

-- The two rows that are not one of the seven slots.
DELETE FROM "ScheduleActivity" WHERE "day" = 'thu' AND "slot" = 'lunch';
DELETE FROM "ScheduleActivity" WHERE "day" = 'wed' AND "name" LIKE 'وقت حر%';

-- A row's own title becomes its description.
UPDATE "ScheduleActivity"
SET "description" = COALESCE("description", "name"), "name" = NULL
WHERE "name" IS NOT NULL;

-- The academy's times, for every row.
UPDATE "ScheduleActivity" AS a
SET "startTime" = s.start_time, "durationMinutes" = s.minutes
FROM (VALUES
  ('reception'::"ScheduleSlot", '07:30', 90),
  ('breakfast',                 '09:00', 30),
  ('prepAndFreeChoice',         '09:30', 30),
  ('dailyActivity',             '10:00', 75),
  ('storyOrCircle',             '11:15', 60),
  ('napTime',                   '12:15', 115),
  ('freePlayAndTalk',           '14:15', 75)
) AS s(slot, start_time, minutes)
WHERE a."slot" = s.slot;
