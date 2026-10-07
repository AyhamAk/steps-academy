-- The afternoon slot after nap, and a description an admin can write for any activity.
ALTER TYPE "ScheduleSlot" ADD VALUE 'freePlayAndTalk';
ALTER TABLE "ScheduleActivity" ADD COLUMN "description" TEXT;
