import { StatusPill } from "@/components/status-pill";
import type { AdminCourse } from "@/lib/types";
import { dateOnlyFormatter } from "@/lib/utils/formatters";

import { studentAccess } from "./words/access-words";

type Enrollment = AdminCourse["enrollments"][number];

// en-US like the side panel's times, so the page reads in one date style.
function formatCourseDate(isoTime: string, timeZone: string) {
  return dateOnlyFormatter(timeZone, "en-US").format(new Date(isoTime));
}

/** The student's name with their email under it; a long email wraps. */
export function StudentIdentity({
  customer,
}: {
  customer: Enrollment["customer"];
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
  access: Pick<Enrollment, "suspendedAt" | "revokedAt">;
  timeZone: string;
};

/** The access word in a pill; Suspended adds its date beside the pill. */
export function AccessPill({ access, timeZone }: AccessPillProps) {
  const studentAccessState = studentAccess(access);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusPill colourPair={studentAccessState.colourPair}>
        {studentAccessState.word}
      </StatusPill>
      {studentAccessState.word === "Suspended" && (
        <span className="text-muted-foreground">
          {formatCourseDate(studentAccessState.suspendedAt, timeZone)}
        </span>
      )}
    </span>
  );
}
