-- Families sign in with their phone number and an SMS code.
--
-- Additive for every existing row: email stays on the accounts that have one
-- (admins, older parents), it just stops being required. Phone numbers are
-- unique; Postgres allows many NULLs under a unique index, so accounts without
-- one don't collide.

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "familyName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
