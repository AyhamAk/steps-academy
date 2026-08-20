-- Translated course titles and descriptions. All nullable: existing courses
-- keep their single `name`, which stays the fallback for any locale without
-- a translation, so nothing has to be backfilled before this ships.
ALTER TABLE "Course" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "Course" ADD COLUMN "nameHe" TEXT;
ALTER TABLE "Course" ADD COLUMN "descriptionAr" TEXT;
ALTER TABLE "Course" ADD COLUMN "descriptionHe" TEXT;
