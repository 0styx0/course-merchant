"use client";

import { useState } from "react";

import { activeStudentEmails } from "@/features/copy-addresses/active-student-emails";
import { CopyAddresses } from "@/features/copy-addresses/copy-addresses";
import type { AdminCourse } from "@/lib/types";

import { StudentOrderMenu } from "./sort/student-order-menu";
import { type StudentOrder, studentsInOrder } from "./sort/students-in-order";
import { StudentCards } from "./student-cards";
import { StudentTable } from "./student-table";

type StudentListProps = {
  courseId: string;
  enrollments: AdminCourse["enrollments"];
  timeZone: string;
};

function StudentListBody({
  courseId,
  enrollments,
  timeZone,
}: StudentListProps) {
  if (enrollments.length === 0) {
    return <p className="mt-4 text-muted-foreground">No students yet.</p>;
  }
  return (
    <>
      <div className="md:hidden">
        <StudentCards
          courseId={courseId}
          enrollments={enrollments}
          timeZone={timeZone}
        />
      </div>
      <div className="hidden md:block">
        <StudentTable
          courseId={courseId}
          enrollments={enrollments}
          timeZone={timeZone}
        />
      </div>
    </>
  );
}

/**
 * Every enrollment the API returns, whatever its access.
 *
 * - The heading counts them all.
 * - The Sort by menu picks their order: newest enrolled first until the admin
 *   picks, and again after a reload.
 * - Below the medium breakpoint each is a card; from it up, a table row. Both
 *   are drawn, so each student has an Un-enroll button and dialog in each.
 * - Beside the Sort by menu, a Copy button puts the Active students'
 *   addresses on the clipboard.
 */
export function StudentList({
  courseId,
  enrollments,
  timeZone,
}: StudentListProps) {
  const [studentOrder, setStudentOrder] = useState<StudentOrder>("newest");
  // The API's order, so the copied text stays the same whichever sort is picked.
  const activeEmails = activeStudentEmails(enrollments);

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="font-heading text-h3">
          Students ({enrollments.length})
        </h2>
        {enrollments.length > 0 && (
          <div className="flex flex-col gap-2 md:items-end">
            <StudentOrderMenu
              order={studentOrder}
              onOrderChange={setStudentOrder}
            />
            {/* A new key when the emails change, so an un-enroll clears the old Copied note. */}
            <CopyAddresses key={activeEmails.join(",")} emails={activeEmails} />
          </div>
        )}
      </div>
      <StudentListBody
        courseId={courseId}
        enrollments={studentsInOrder(enrollments, studentOrder)}
        timeZone={timeZone}
      />
    </section>
  );
}
