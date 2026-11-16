import type { AdminCourse } from "@/lib/types";
import { dateOnlyFormatter } from "@/lib/utils/formatters";

type StudentListProps = {
  enrollments: AdminCourse["enrollments"];
  timeZone: string;
};

function StudentRows({ enrollments, timeZone }: StudentListProps) {
  if (enrollments.length === 0) {
    return <p className="mt-4 text-muted-foreground">No students yet.</p>;
  }
  // en-US like the side panel's times, so the page reads in one date style.
  const enrolledDateFormatter = dateOnlyFormatter(timeZone, "en-US");
  return (
    <ul className="mt-4 space-y-2">
      {enrollments.map(({ customer, enrolledAt }) => (
        <li key={customer.id}>
          {customer.name} · {customer.email} · enrolled{" "}
          {enrolledDateFormatter.format(new Date(enrolledAt))}
        </li>
      ))}
    </ul>
  );
}

/**
 * Every enrollment the API returns, whatever its access, by name, email and
 * the date they enrolled in the course's time zone. Revoked and active
 * students read alike.
 */
export function StudentList({ enrollments, timeZone }: StudentListProps) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-h3">Students</h2>
      <StudentRows enrollments={enrollments} timeZone={timeZone} />
    </section>
  );
}
