import { api } from "./api";
import { WeekDay } from "./scheduleApi";

export type EnrollmentStatus = "pending" | "approved" | "rejected" | "cancelled";

export type MyEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  status: EnrollmentStatus;
};

export type Course = {
  id: string;
  /** The academy's own wording, and the fallback when a locale has no translation. */
  name: string;
  nameAr: string | null;
  nameHe: string | null;
  description: string | null;
  descriptionAr: string | null;
  descriptionHe: string | null;
  emoji: string;
  instructor: string | null;
  /** Days it runs on, e.g. ["sun","wed"]. Structured so it can be translated. */
  weekDays: WeekDay[];
  /** 24-hour "HH:MM". */
  startTime: string | null;
  /** Calendar range, "YYYY-MM-DD". */
  startDate: string | null;
  endDate: string | null;
  capacity: number;
  accentColor: string | null;
  isActive: boolean;
  approvedCount: number;
  /** Requests awaiting an admin decision. */
  pendingCount: number;
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
  /** Null once the requesting guardian has deleted their account. */
  requestedBy: { id: string; name: string; email: string } | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string } | null;
  /** Approved with no decider — the course had room and they just joined. */
  joinedAutomatically: boolean;
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

export async function listEnrollments(filter: { status?: EnrollmentStatus; courseId?: string } = {}) {
  const { data } = await api.get<{ enrollments: EnrollmentRequest[]; pendingCount: number }>(
    "/api/courses/enrollments",
    { params: filter }
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

export type CourseInput = {
  name: string;
  nameAr?: string | null;
  nameHe?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  descriptionHe?: string | null;
  emoji?: string;
  instructor?: string | null;
  weekDays?: WeekDay[];
  startTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number;
  accentColor?: string | null;
  isActive?: boolean;
};

export async function createCourse(input: CourseInput) {
  const { data } = await api.post<{ course: Course }>("/api/courses", input);
  return data.course;
}

export async function updateCourse(courseId: string, input: Partial<CourseInput>) {
  const { data } = await api.patch<{ course: Course }>(`/api/courses/${courseId}`, input);
  return data.course;
}

export async function deleteCourse(courseId: string) {
  await api.delete(`/api/courses/${courseId}`);
}
