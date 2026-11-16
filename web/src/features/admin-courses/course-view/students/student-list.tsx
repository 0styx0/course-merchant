import type { AdminCourse } from "@/lib/types";

import { StudentCards } from "./student-cards";

type StudentListProps = {
  enrollments: AdminCourse["enrollments"];
  timeZone: string;
};

function StudentListBody({ enrollments, timeZone }: StudentListProps) {
  if (enrollments.length === 0) {
    return <p className="mt-4 text-muted-foreground">No students yet.</p>;
  }
  return <StudentCards enrollments={enrollments} timeZone={timeZone} />;
}

/**
 * Every enrollment the API returns, whatever its access, counted in the
 * heading and drawn as one card each.
 */
export function StudentList({ enrollments, timeZone }: StudentListProps) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-h3">Students ({enrollments.length})</h2>
      <StudentListBody enrollments={enrollments} timeZone={timeZone} />
    </section>
  );
}
