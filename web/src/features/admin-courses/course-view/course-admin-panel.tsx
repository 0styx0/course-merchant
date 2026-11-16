import Link from "next/link";

import { editCoursePath } from "@/features/admin-courses/addresses/admin-course-path";
import { formatMoment } from "@/features/admin-courses/schedule/summary/format-moment";
import {
  splitPricesByStart,
  storedPriceStartMs,
} from "@/features/admin-courses/price/split-prices-by-start";
import { isShownInShop } from "@/features/admin-courses/shop-visibility/is-shown-in-shop";
import { shopCoursePath } from "@/features/courses/shop-course-path";
import type { AdminCourse } from "@/lib/types";
import { AdminPriceLines } from "./admin-price-lines";
import { CourseStatusPill } from "./course-status-pill";

const PANEL_CLASS = "mt-6 rounded-lg bg-surface-alt p-6 md:mt-0";

type CourseAdminPanelProps = {
  course: AdminCourse;
  /** When the page rendered, in milliseconds since 1970; decides which prices are in effect. */
  renderMs: number;
};

/** "Starts …" and "Ends …" in the course's zone, then the zone's name. */
function ScheduleLines({ schedule }: { schedule: AdminCourse["schedule"] }) {
  const { startTime, endTime, timeZone } = schedule;
  return (
    <div className="mt-3">
      <p className="font-medium">
        Starts {formatMoment(Date.parse(startTime), timeZone)}
      </p>
      <p className="font-medium">
        Ends {formatMoment(Date.parse(endTime), timeZone)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Times in {timeZone}</p>
    </div>
  );
}

/** Plain text, never a link: the API accepts any address, so a clickable one could run a `javascript:` address. */
function PrivateCourseLinkLine({ contentUrl }: { contentUrl: string }) {
  return <p className="mt-4 break-all">Course link: {contentUrl}</p>;
}

function CourseActionLinks({
  course,
  isPublicPageShown,
}: {
  course: AdminCourse;
  isPublicPageShown: boolean;
}) {
  return (
    <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      <Link className="underline" href={editCoursePath(course.id)}>
        Edit course
      </Link>
      {isPublicPageShown && (
        <Link className="underline" href={shopCoursePath(course.id)}>
          View public page
        </Link>
      )}
    </p>
  );
}

/** A flat panel with the course's status, times, prices, private link and the links to edit it and see it in the shop. */
export function CourseAdminPanel({ course, renderMs }: CourseAdminPanelProps) {
  const pricesOldestFirst = course.prices.toSorted(
    (a, b) => storedPriceStartMs(a) - storedPriceStartMs(b),
  );
  const { inEffect, future } = splitPricesByStart(pricesOldestFirst, renderMs);
  return (
    <aside
      aria-label={`Admin details of ${course.name}`}
      className={PANEL_CLASS}
    >
      <CourseStatusPill statusName={course.status.name} />
      <ScheduleLines schedule={course.schedule} />
      <AdminPriceLines
        pricesInEffect={inEffect}
        scheduledPrices={future}
        timeZone={course.schedule.timeZone}
      />
      <PrivateCourseLinkLine contentUrl={course.contentUrl} />
      <CourseActionLinks
        course={course}
        isPublicPageShown={isShownInShop(course.status.name, inEffect.length)}
      />
    </aside>
  );
}
