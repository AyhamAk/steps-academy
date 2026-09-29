-- Albums now say which program they belong to: nursery, courses, or both.
--
-- Purely additive. Every existing album becomes "both", so it still shows in
-- both galleries and no parent loses sight of a photo. Apps already installed
-- never send the field, so their new albums get "both" too.

-- CreateEnum
CREATE TYPE "Program" AS ENUM ('nursery', 'courses', 'both');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "program" "Program" NOT NULL DEFAULT 'both';
