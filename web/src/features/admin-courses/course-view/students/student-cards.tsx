import type { ReactNode } from "react";

import type { AdminCourse } from "@/lib/types";

import {
  AccessPill,
  AttentionLines,
  EnrolledDate,
  PaidAmount,
  PaymentPill,
  StudentIdentity,
} from "./student-fields";
import { UnenrollButton } from "./unenroll/unenroll-button";
import { attentionLineWords } from "./words/attention-lines";

type StudentCardsProps = {
  courseId: string;
  enrollments: AdminCourse["enrollments"];
  timeZone: string;
};

/** One labelled field of a student card. */
function StudentCardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-eyebrow uppercase text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

type StudentCardProps = {
  courseId: string;
  enrollment: AdminCourse["enrollments"][number];
  timeZone: string;
};

function StudentCard({ courseId, enrollment, timeZone }: StudentCardProps) {
  const lines = attentionLineWords(enrollment);
  return (
    <li className="min-w-0 rounded-lg border p-4">
      <dl className="space-y-3">
        <StudentCardField label="Student">
          <StudentIdentity customer={enrollment.customer} />
        </StudentCardField>
        <StudentCardField label="Enrolled">
          <EnrolledDate
            enrolledAt={enrollment.enrolledAt}
            timeZone={timeZone}
          />
        </StudentCardField>
        <StudentCardField label="Access">
          <AccessPill enrollmentDates={enrollment} timeZone={timeZone} />
        </StudentCardField>
        <StudentCardField label="Paid">
          <PaidAmount payment={enrollment.payment} />
        </StudentCardField>
        <StudentCardField label="Payment">
          <PaymentPill payment={enrollment.payment} />
        </StudentCardField>
        {lines.length > 0 && (
          <StudentCardField label="Attention">
            <AttentionLines lines={lines} />
          </StudentCardField>
        )}
      </dl>
      {/* UnenrollButton draws nothing for an un-enrolled student, so the
          empty box hides with it. */}
      <div className="mt-4 empty:hidden">
        <UnenrollButton courseId={courseId} enrollment={enrollment} />
      </div>
    </li>
  );
}

/**
 * Each student as a card: who they are, when they enrolled, their access,
 * what they paid, the payment's state, what needs the owner's action and,
 * last, Un-enroll for a student who still has access.
 */
export function StudentCards({
  courseId,
  enrollments,
  timeZone,
}: StudentCardsProps) {
  return (
    <ul className="mt-4 space-y-3">
      {enrollments.map((enrollment) => (
        <StudentCard
          key={enrollment.customer.id}
          courseId={courseId}
          enrollment={enrollment}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}
