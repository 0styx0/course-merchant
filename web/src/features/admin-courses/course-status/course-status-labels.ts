import type { AdminCourse } from "@/lib/types";

/** The label the admin sees for each course status. */
export const courseStatusLabels = {
  published: "Published",
  drafted: "Drafted",
  archived: "Archived",
  deleted: "Deleted",
} satisfies Record<AdminCourse["status"]["name"], string>;
