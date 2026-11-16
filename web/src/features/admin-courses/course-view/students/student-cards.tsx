import type { ReactNode } from "react";

import type { AdminCourse } from "@/lib/types";

import {
  AccessPill,
  EnrolledDate,
  PaidAmount,
  PaymentPill,
  StudentIdentity,
} from "./student-fields";

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

/** Each student as a card: who they are, when they enrolled, their access, what they paid and the payment's state. */
export function StudentCards({ enrollments, timeZone }: StudentCardsProps) {
  return (
    <ul className="mt-4 space-y-3">
      {enrollments.map((enrollment) => (
        <li
          key={enrollment.customer.id}
          className="min-w-0 rounded-lg border p-4"
        >
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
          </dl>
        </li>
      ))}
    </ul>
  );
}
