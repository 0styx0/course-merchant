import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Course } from "@/lib/types";
import { VisitorTimeLine } from "./visitor-time-line";

const newYorkWinterAfternoon: Course["schedule"] = {
  startTime: "2030-01-15T20:00:00Z",
  endTime: "2030-01-15T22:00:00Z",
  timeZone: "America/New_York",
};

function setBrowserZone(timeZone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

describe("VisitorTimeLine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the visitor's time when the browser's offset differs", () => {
    setBrowserZone("America/Los_Angeles");

    render(
      <VisitorTimeLine schedule={newYorkWinterAfternoon} locale="en-US" />,
    );

    expect(screen.getByText(/12:00.*2:00 PM PST your time/)).toBeVisible();
  });

  it("renders nothing when the browser's offset matches the course's", () => {
    setBrowserZone("America/Toronto");

    const { container } = render(
      <>
        <p>Course line</p>
        <VisitorTimeLine schedule={newYorkWinterAfternoon} locale="en-US" />
      </>,
    );

    expect(container).toHaveTextContent(/^Course line$/);
  });
});
