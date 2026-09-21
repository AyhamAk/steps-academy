-- Parents are now told when a tip is published.
--
-- Purely additive: a new enum value and two nullable columns. Apps already
-- installed keep working — they simply never receive a `tip` notification
-- until they update, and an unknown type falls through to the announcement
-- rendering rather than crashing.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'tip';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "tipId" TEXT,
ADD COLUMN     "tipTitle" TEXT;
