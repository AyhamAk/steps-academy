-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "weekDays" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "courseName" TEXT;
