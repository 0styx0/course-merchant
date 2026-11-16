import type { AdminCourse } from "@/lib/types";

type StudentListProps = {
  enrollments: AdminCourse["enrollments"];
};

function StudentRows({ enrollments }: StudentListProps) {
  if (enrollments.length === 0) {
    return <p className="mt-4 text-muted-foreground">No students yet.</p>;
  }
  return (
    <ul className="mt-4 space-y-2">
      {enrollments.map(({ customer }) => (
        <li key={customer.id}>
          {customer.name} · {customer.email}
        </li>
      ))}
    </ul>
  );
}

/** Every enrollment the API returns, whatever its access, by name and email. */
export function StudentList({ enrollments }: StudentListProps) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-h3">Students</h2>
      <StudentRows enrollments={enrollments} />
    </section>
  );
}
