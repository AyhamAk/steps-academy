-- The academy's default day, Sunday to Thursday. Separate from the migration
-- that adds 'freePlayAndTalk': Postgres cannot use a new enum value in the
-- same transaction that created it.

-- The old English demo rows on Monday and Tuesday.
DELETE FROM "ScheduleActivity"
WHERE "day" IN ('mon', 'tue')
  AND "name" IN ('Morning Circle', 'Music Circle', 'Sensory Play', 'Puzzle Time',
                 'Numbers & Math', 'Art & Craft', 'Outdoor Play');

-- Every slot a day does not have yet, at its usual time, with no title of its
-- own. Slots a day already covers keep what the academy wrote.
INSERT INTO "ScheduleActivity" ("id", "day", "slot", "name", "emoji", "startTime", "durationMinutes")
SELECT gen_random_uuid()::text, d.day, s.slot, NULL, s.emoji, s.start_time, s.minutes
FROM (VALUES ('sun'::"WeekDay"), ('mon'), ('tue'), ('wed'), ('thu')) AS d(day)
CROSS JOIN (VALUES
  ('reception'::"ScheduleSlot", '👋', '07:30', 90),
  ('breakfast',                 '🥣', '09:00', 30),
  ('prepAndFreeChoice',         '🧩', '09:30', 30),
  ('dailyActivity',             '🎨', '10:00', 75),
  ('storyOrCircle',             '📖', '11:15', 60),
  ('napTime',                   '😴', '12:15', 115),
  ('freePlayAndTalk',           '💬', '14:15', 75)
) AS s(slot, emoji, start_time, minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM "ScheduleActivity" a WHERE a."day" = d.day AND a."slot" = s.slot
);
