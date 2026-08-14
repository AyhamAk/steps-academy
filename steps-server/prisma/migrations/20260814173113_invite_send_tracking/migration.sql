-- AlterTable
ALTER TABLE "InviteCode" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "guardianPhone" TEXT;
