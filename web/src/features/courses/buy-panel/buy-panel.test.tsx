import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import type { Course } from "@/lib/types";
import { endedCourse, freeCourse, reactCourse } from "@/mocks/fixtures/courses";
import { BuyPanel, EndedPanel } from "./buy-panel";

function renderPanel(props: Partial<Parameters<typeof BuyPanel>[0]> = {}) {
  return render(
    <BuyPanel
      courseName={reactCourse.name}
      schedule={reactCourse.schedule}
      price="$99"
      locale="en-US"
      // An upcoming course adds only its eyebrow, so most tests start from it.
      stage="upcoming"
      {...props}
    >
      <button type="button">Enroll now</button>
    </BuyPanel>,
  );
}

describe("BuyPanel", () => {
  it("is a region named after the course", () => {
    renderPanel();

    expect(
      screen.getByRole("complementary", {
        name: "Enroll in React Fundamentals",
      }),
    ).toBeVisible();
  });

  it("shows the schedule, the price and the buy button", () => {
    renderPanel();

    expect(screen.getByText("Oct 1, 2030, 2:00 PM")).toHaveAttribute(
      "datetime",
      "2030-10-01T18:00:00Z",
    );
    expect(screen.getByText("Oct 1, 2030, 4:00 PM")).toHaveAttribute(
      "datetime",
      "2030-10-01T20:00:00Z",
    );
    expect(screen.getByText("America/New_York")).toBeVisible();
    expect(screen.getByText("$99")).toBeVisible();
    expect(screen.getByRole("button", { name: "Enroll now" })).toBeVisible();
  });

  it("reads schedule, price, then the button", () => {
    renderPanel();

    const schedule = screen.getByText("America/New_York");
    const price = screen.getByText("$99");
    const button = screen.getByRole("button", { name: "Enroll now" });
    const follows = Node.DOCUMENT_POSITION_FOLLOWING;

    expect(schedule.compareDocumentPosition(price)).toBe(follows);
    expect(price.compareDocumentPosition(button)).toBe(follows);
  });

  it("shows no Price, Schedule or Enrollment labels", () => {
    renderPanel();

    expect(screen.queryByText("Price")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Enrollment")).not.toBeInTheDocument();
  });

  it("fills the panel with the alternate surface colour", () => {
    renderPanel();

    const panel = screen.getByRole("complementary");
    expect(panel).toHaveClass("bg-surface-alt");
  });

  it("shows the price text it is given, such as Free", () => {
    renderPanel({ price: "Free", schedule: freeCourse.schedule });

    expect(screen.getByText("Free")).toBeVisible();
  });

  it("opens an upcoming course with the start date in the course's time zone", () => {
    renderPanel({ stage: "upcoming" });

    expect(screen.getByText("Starts Oct 1, 2030")).toBeVisible();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });

  it("opens a course in progress with its label, and tells the visitor they can still enroll", () => {
    renderPanel({ stage: "in-progress" });

    expect(screen.getByText("In progress")).toBeVisible();
    expect(
      screen.getByText("This course has started. You can still enroll."),
    ).toBeVisible();
    expect(screen.queryByText(/^Starts/)).not.toBeInTheDocument();
  });

  it("reads the in-progress sentence after the price and before the button", () => {
    renderPanel({ stage: "in-progress" });

    const price = screen.getByText("$99");
    const sentence = screen.getByText(
      "This course has started. You can still enroll.",
    );
    const button = screen.getByRole("button", { name: "Enroll now" });
    const follows = Node.DOCUMENT_POSITION_FOLLOWING;

    expect(price.compareDocumentPosition(sentence)).toBe(follows);
    expect(sentence.compareDocumentPosition(button)).toBe(follows);
  });

  it("writes the start date in the course's zone when UTC falls on another day", () => {
    renderPanel({
      stage: "upcoming",
      schedule: {
        startTime: "2030-10-02T02:00:00Z",
        endTime: "2030-10-02T04:00:00Z",
        timeZone: "America/New_York",
      },
    });

    expect(screen.getByText("Starts Oct 1, 2030")).toBeVisible();
  });

  it("writes the start date in the visitor's locale", () => {
    renderPanel({ locale: "en-GB" });

    expect(screen.getByText("Starts 1 Oct 2030")).toBeVisible();
  });

  it("keeps the course's zone for the start date in another locale", () => {
    renderPanel({
      locale: "en-GB",
      schedule: {
        startTime: "2030-10-02T02:00:00Z",
        endTime: "2030-10-02T04:00:00Z",
        timeZone: "America/New_York",
      },
    });

    expect(screen.getByText("Starts 1 Oct 2030")).toBeVisible();
  });
});

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

    expect(screen.getByText("Ended")).toHaveClass("bg-muted");
  });
});
