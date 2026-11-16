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
import { attentionLineWords } from "./words/attention-lines";

type StudentCardsProps = {
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
  enrollment: AdminCourse["enrollments"][number];
  timeZone: string;
};

function StudentCard({ enrollment, timeZone }: StudentCardProps) {
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
          <AccessPill access={enrollment} timeZone={timeZone} />
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
    </li>
  );
}

/**
 * Each student as a card: who they are, when they enrolled, their access,
 * what they paid, the payment's state and what needs the owner's action.
 */
export function StudentCards({ enrollments, timeZone }: StudentCardsProps) {
  return (
    <ul className="mt-4 space-y-3">
      {enrollments.map((enrollment) => (
        <StudentCard
          key={enrollment.customer.id}
          enrollment={enrollment}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}
