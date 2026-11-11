import type { ReactNode } from "react";

import { CourseSchedule } from "../course-schedule";
import type { Course } from "@/lib/types";

type BuyPanelProps = {
  courseName: string;
  schedule: Course["schedule"];
  /** The formatted price, such as "$99" or "Free". */
  price: string;
  /** The buy button, shown under the price. */
  children: ReactNode;
};

/** A flat panel that lists the schedule and price above the buy button. */
export function BuyPanel({
  courseName,
  schedule,
  price,
  children,
}: BuyPanelProps) {
  return (
    <aside
      aria-label={`Enroll in ${courseName}`}
      className="mt-6 rounded-lg bg-surface-alt p-6 md:mt-0"
    >
      <CourseSchedule schedule={schedule} />
      <p className="mt-4 font-semibold">{price}</p>
      {children}
    </aside>
  );
}
