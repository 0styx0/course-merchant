import { courseStatusLabels } from "@/features/admin-courses/course-status/course-status-labels";
import type { AdminCourse } from "@/lib/types";

const PILL_CLASS = "inline-block rounded-full px-3 py-1 text-eyebrow uppercase";

/** Published reads green; every other status reads grey. */
function pillColourClass(statusName: AdminCourse["status"]["name"]) {
  if (statusName === "published") return "bg-success text-success-foreground";
  return "bg-muted text-muted-foreground";
}

/** The course's status as a word in a pill. */
export function CourseStatusPill({
  statusName,
}: {
  statusName: AdminCourse["status"]["name"];
}) {
  return (
    <span className={`${PILL_CLASS} ${pillColourClass(statusName)}`}>
      {courseStatusLabels[statusName]}
    </span>
  );
}
