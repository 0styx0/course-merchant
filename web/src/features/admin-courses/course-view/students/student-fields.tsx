import { CircleAlert } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import type { AdminCourse } from "@/lib/types";
import { studentAccess } from "@/features/student-access/student-access";
import { dateOnlyFormatter, formatPrice } from "@/lib/utils/formatters";

import { paymentWords } from "./words/payment-words";

type Enrollment = AdminCourse["enrollments"][number];
type PaymentProps = { payment: Enrollment["payment"] };

// en-US like the side panel's times, so the page reads in one date style.
function formatCourseDate(isoTime: string, timeZone: string) {
  return dateOnlyFormatter(timeZone, "en-US").format(new Date(isoTime));
}

/**
 * The student's name with their email under it, on the course page and the
 * Students page. A long email wraps in a card; a table cell keeps it on one
 * line and the table scrolls instead.
 */
export function StudentIdentity({
  customer,
}: {
  customer: { name: string; email: string };
}) {
  return (
    <div className="min-w-0">
      <p className="font-medium">{customer.name}</p>
      <p className="wrap-anywhere text-muted-foreground">{customer.email}</p>
    </div>
  );
}

/** The date the student enrolled, in the course's time zone. */
export function EnrolledDate({
  enrolledAt,
  timeZone,
}: {
  enrolledAt: string;
  timeZone: string;
}) {
  return <>{formatCourseDate(enrolledAt, timeZone)}</>;
}

type AccessPillProps = {
  enrollmentDates: Pick<Enrollment, "suspendedAt" | "revokedAt">;
  timeZone: string;
};

/** The access word in a pill; Suspended adds its date beside the pill. */
export function AccessPill({ enrollmentDates, timeZone }: AccessPillProps) {
  const access = studentAccess(enrollmentDates);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusPill colourPair={access.colourPair}>{access.word}</StatusPill>
      {access.word === "Suspended" && (
        <span className="text-muted-foreground">
          {formatCourseDate(access.suspendedAt, timeZone)}
        </span>
      )}
    </span>
  );
}

/** What the student paid in their currency; a free enrollment shows the Free pill. */
export function PaidAmount({ payment }: PaymentProps) {
  if (payment === null) {
    return <StatusPill colourPair="secondary">Free</StatusPill>;
  }
  return <>{formatPrice(payment.amount, payment.currency)}</>;
}

/** The payment's state in a pill; a free enrollment has none, so it shows a dash. */
export function PaymentPill({ payment }: PaymentProps) {
  if (payment === null) return <>—</>;
  const { word, colourPair } = paymentWords(payment.status);
  return <StatusPill colourPair={colourPair}>{word}</StatusPill>;
}

/** Each Attention line as red text with an alert icon; the icon is decoration. */
export function AttentionLines({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line} className="flex items-center gap-2 text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {line}
        </li>
      ))}
    </ul>
  );
}
