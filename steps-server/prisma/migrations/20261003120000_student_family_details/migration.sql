-- The academy's roster sheet, per child: ID number, group, mother's name, and
-- the mother's and father's mobiles (which also fill guardianPhones).

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "nationalId" TEXT;
ALTER TABLE "Student" ADD COLUMN "groupName" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherName" TEXT;
ALTER TABLE "Student" ADD COLUMN "motherPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN "fatherPhone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_nationalId_key" ON "Student"("nationalId");
