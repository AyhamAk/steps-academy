import { api } from "./api";

export type EnrollmentStatus = "pending" | "approved" | "rejected" | "cancelled";

export type MyEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  status: EnrollmentStatus;
};

export type Course = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  instructor: string | null;
  schedule: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number;
  accentColor: string | null;
  isActive: boolean;
  approvedCount: number;
  /** null means unlimited places rather than "full". */
  spotsLeft: number | null;
  /** Only ever the caller's own children. */
  myEnrollments: MyEnrollment[];
};

export type EnrollmentRequest = {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  status: EnrollmentStatus;
  note: string | null;
  requestedAt: string;
  requestedBy: { id: string; name: string; email: string };
  decidedAt: string | null;
  decidedBy: { id: string; name: string } | null;
};

export async function listCourses() {
  const { data } = await api.get<{ courses: Course[] }>("/api/courses");
  return data.courses;
}

export async function requestEnrollment(courseId: string, studentId: string) {
  const { data } = await api.post<{ enrollment: EnrollmentRequest }>(
    `/api/courses/${courseId}/enroll`,
    { studentId }
  );
  return data.enrollment;
}

export async function cancelEnrollment(enrollmentId: string) {
  await api.delete(`/api/courses/enrollments/${enrollmentId}`);
}

// ── Admin ──

export async function listEnrollments(status?: EnrollmentStatus) {
  const { data } = await api.get<{ enrollments: EnrollmentRequest[]; pendingCount: number }>(
    "/api/courses/enrollments",
    { params: status ? { status } : undefined }
  );
  return data;
}

export async function decideEnrollment(
  enrollmentId: string,
  status: "approved" | "rejected",
  note?: string
) {
  const { data } = await api.patch<{ enrollment: EnrollmentRequest }>(
    `/api/courses/enrollments/${enrollmentId}`,
    { status, note }
  );
  return data.enrollment;
}

export async function enrollmentSummary() {
  const { data } = await api.get<{ pendingCount: number }>("/api/courses/enrollments/summary");
  return data.pendingCount;
}

export async function createCourse(input: {
  name: string;
  description?: string;
  emoji?: string;
  instructor?: string;
  schedule?: string;
  capacity?: number;
}) {
  const { data } = await api.post<{ course: Course }>("/api/courses", input);
  return data.course;
}

export async function deleteCourse(courseId: string) {
  await api.delete(`/api/courses/${courseId}`);
}
