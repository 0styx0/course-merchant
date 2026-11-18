import type { Metadata } from "next";
import { connection } from "next/server";

import { ProblemAlert } from "@/components/problem-alert";
import { StudentIdentity } from "@/features/admin-courses/course-view/students/student-fields";
import { listCustomersAsAdmin } from "@/features/admin-students/api/admin-students.api";
import { selectStudents } from "@/features/admin-students/lists/customer-groups";
import { AdminPageFrame } from "@/features/site-layout/admin-page-frame";
import type { AdminCustomer } from "@/lib/types";

export const metadata: Metadata = {
  title: "Students",
  robots: { index: false },
};

function StudentRows({ students }: { students: AdminCustomer[] }) {
  if (students.length === 0) {
    return <p className="mt-6 text-muted-foreground">No students yet.</p>;
  }
  return (
    <ul className="mt-6 space-y-4">
      {students.map((student) => (
        <li key={student.id}>
          <StudentIdentity customer={student} />
        </li>
      ))}
    </ul>
  );
}

function StudentsOverview({ students }: { students: AdminCustomer[] }) {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">
        Students ({students.length})
      </h1>
      <StudentRows students={students} />
    </>
  );
}

export default async function AdminStudentsPage() {
  await connection();
  const result = await listCustomersAsAdmin();

  return (
    <AdminPageFrame>
      {result.state === "failure" ? (
        <ProblemAlert problem={result.error} />
      ) : (
        <StudentsOverview students={selectStudents(result.data.customers)} />
      )}
    </AdminPageFrame>
  );
}
