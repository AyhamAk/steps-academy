-- The academy's updated day: lunch 11:15–11:35 every day, then circle / story
-- / music 11:35–12:15.

UPDATE "ScheduleActivity" SET "startTime" = '11:35', "durationMinutes" = 40
WHERE "slot" = 'storyOrCircle';

UPDATE "ScheduleActivity" SET "startTime" = '11:15', "durationMinutes" = 20
WHERE "slot" = 'lunch';

INSERT INTO "ScheduleActivity" ("id", "day", "slot", "name", "emoji", "startTime", "durationMinutes")
SELECT gen_random_uuid()::text, d.day, 'lunch', NULL, '🍽️', '11:15', 20
FROM (VALUES ('sun'::"WeekDay"), ('mon'), ('tue'), ('wed'), ('thu')) AS d(day)
WHERE NOT EXISTS (
  SELECT 1 FROM "ScheduleActivity" a WHERE a."day" = d.day AND a."slot" = 'lunch'
);
