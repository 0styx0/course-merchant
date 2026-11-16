import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import type { Course } from "@/lib/types";
import { endedCourse, endedLongCourse } from "@/mocks/fixtures/courses";
import { EndedPanel } from "./ended-panel";

describe("EndedPanel", () => {
  function renderEndedPanel(
    schedule: Course["schedule"] = endedCourse.schedule,
    locale = "en-US",
  ) {
    return render(
      <EndedPanel
        courseName={endedCourse.name}
        schedule={schedule}
        locale={locale}
      />,
    );
  }

  it("is a region named after the course, not an enroll prompt", () => {
    renderEndedPanel();

    expect(
      screen.getByRole("complementary", { name: "Intro to Go" }),
    ).toBeVisible();
  });

  it("shows the Ended pill, the start date, the sentence and a link to current courses", () => {
    renderEndedPanel();

    expect(screen.getByText("Ended")).toBeVisible();
    expect(screen.getByText("Sep 1, 2025")).toBeVisible();
    expect(screen.getByText("This course has ended.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "See current courses →" }),
    ).toHaveAttribute("href", "/");
  });

  it("writes the start date in the course's zone when UTC falls on another day", () => {
    renderEndedPanel({
      startTime: "2025-09-02T02:00:00Z",
      endTime: "2025-09-02T04:00:00Z",
      timeZone: "America/New_York",
    });

    expect(screen.getByText("Sep 1, 2025")).toBeVisible();
  });

  it("writes the start date in the visitor's locale", () => {
    // October, because newer ICU data writes en-GB September as "Sept".
    renderEndedPanel(
      {
        startTime: "2025-10-01T14:00:00Z",
        endTime: "2025-10-01T16:00:00Z",
        timeZone: "America/New_York",
      },
      "en-GB",
    );

    expect(screen.getByText("1 Oct 2025")).toBeVisible();
  });

  it("shows the course's length under the date", () => {
    renderEndedPanel();

    expect(screen.getByText("2 hours")).toBeVisible();
  });

  it("shows an ended course of 28 days or more as its date range with no length", () => {
    renderEndedPanel(endedLongCourse.schedule);

    expect(screen.getByText("Dec 31, 2015 – Nov 30, 2025")).toBeVisible();
    expect(screen.queryByText(/days/)).not.toBeInTheDocument();
  });

  it("shows no price, schedule zone or button", () => {
    renderEndedPanel();

    expect(screen.getByText("Ended")).toBeVisible();
    expect(screen.queryByText("America/New_York")).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("colours the pill muted", () => {
    renderEndedPanel();

    expect(screen.getByText("Ended")).toHaveClass(
      "bg-muted",
      "text-muted-foreground",
    );
  });
});
