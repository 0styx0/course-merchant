import { StatusPill } from "@/components/status-pill";
import { courseStatusLabels } from "@/features/admin-courses/course-status/course-status-labels";
import type { AdminCourse } from "@/lib/types";

/** Published reads green; every other status reads grey. */
function pillColourPair(statusName: AdminCourse["status"]["name"]) {
  return statusName === "published" ? "success" : "muted";
}

/** The course's status as a word in a pill. */
export function CourseStatusPill({
  statusName,
}: {
  statusName: AdminCourse["status"]["name"];
}) {
  return (
    <StatusPill colourPair={pillColourPair(statusName)}>
      {courseStatusLabels[statusName]}
    </StatusPill>
  );
}
