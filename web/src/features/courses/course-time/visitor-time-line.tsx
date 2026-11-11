"use client";

import type { Course } from "@/lib/types";
import { makeVisitorTimeLine } from "./visitor-time";
import { useVisitorTimeZone } from "./use-visitor-time-zone";

type VisitorTimeLineProps = {
  schedule: Course["schedule"];
  /** The visitor's locale, such as "en-US". */
  locale: string;
};

/** The course's time in the visitor's zone; nothing until hydration, or when the visitor's offset matches the course's. */
export function VisitorTimeLine({ schedule, locale }: VisitorTimeLineProps) {
  const visitorTimeZone = useVisitorTimeZone();
  const line =
    visitorTimeZone && makeVisitorTimeLine(schedule, locale, visitorTimeZone);
  if (!line) return null;
  return <p className="mt-1 text-sm text-muted-foreground">{line}</p>;
}
