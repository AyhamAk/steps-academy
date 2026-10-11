-- AlterTable
ALTER TABLE "ScheduleActivity" ADD COLUMN     "weekStart" TEXT;

-- CreateTable
CREATE TABLE "WeekTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days" JSONB NOT NULL,
    "sourceWeekStart" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateApplication" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSuggestionDismissal" (
    "weekStart" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleSuggestionDismissal_pkey" PRIMARY KEY ("weekStart")
);

-- CreateIndex
CREATE INDEX "TemplateApplication_weekStart_idx" ON "TemplateApplication"("weekStart");

-- CreateIndex
CREATE INDEX "ScheduleActivity_weekStart_idx" ON "ScheduleActivity"("weekStart");

