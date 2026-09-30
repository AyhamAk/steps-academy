-- Course families sign up without an invite code and add their own child.
--
-- Purely additive. Every existing student was added by the academy, so the
-- default false is true of all of them.

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "addedByParent" BOOLEAN NOT NULL DEFAULT false;
