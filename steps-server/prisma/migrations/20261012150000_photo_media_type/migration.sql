-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('photo', 'video');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "durationSec" INTEGER,
ADD COLUMN     "mediaType" "MediaType" NOT NULL DEFAULT 'photo',
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER;

