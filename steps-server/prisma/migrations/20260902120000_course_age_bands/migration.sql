-- The age range a course is for, in whole years.
--
-- Both nullable on purpose: existing courses have no ages, and a course that
-- declares none belongs to the academy as a whole rather than disappearing
-- from every age-filtered screen.
ALTER TABLE "Course" ADD COLUMN "ageMinYears" INTEGER;
ALTER TABLE "Course" ADD COLUMN "ageMaxYears" INTEGER;
