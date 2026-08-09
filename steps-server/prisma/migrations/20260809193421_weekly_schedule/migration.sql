-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('sun', 'mon', 'tue', 'wed', 'thu');

-- CreateTable
CREATE TABLE "ScheduleActivity" (
    "id" TEXT NOT NULL,
    "day" "WeekDay" NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🌟',
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "accentColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleActivity_day_idx" ON "ScheduleActivity"("day");
