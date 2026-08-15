-- An enrolment must survive the deletion of the account that requested it,
-- otherwise a parent deleting their account removes their child's place.
ALTER TABLE "CourseEnrollment" ALTER COLUMN "requestedBy" DROP NOT NULL;

ALTER TABLE "CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_requestedBy_fkey";
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_decidedBy_fkey";
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_decidedBy_fkey"
  FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
