import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Course } from "@/lib/types";
import { endedCourse, freeCourse, reactCourse } from "@/mocks/fixtures/courses";
import { BuyPanel, EndedPanel } from "./buy-panel";

// The shared test setup freezes the clock in 2026, so reactCourse (2030) is more than 14 days away and reads "Starts <date>".
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the course's time in the visitor's zone when the offsets differ", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Asia/Tokyo",
    } as Intl.ResolvedDateTimeFormatOptions);

    renderPanel();

    expect(screen.getByText(/Wed, Oct 2.*GMT\+9 your time/)).toBeVisible();
  });

  describe("the day before the start, in the visitor's zone", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2030-09-30T16:00:00Z"));
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions",
      ).mockReturnValue({
        timeZone: "America/New_York",
      } as Intl.ResolvedDateTimeFormatOptions);
    });

    it("reads 'Starts tomorrow' and still shows the course's date", () => {
      renderPanel();

      expect(screen.getByText("Starts tomorrow")).toBeVisible();
      expect(screen.getByText("Tue, Oct 1, 2:00 – 4:00 PM EDT")).toBeVisible();
    });

    it("keeps the date range of a course lasting days under 'Starts tomorrow'", () => {
      renderPanel({
        schedule: { ...reactCourse.schedule, endTime: "2030-10-03T18:00:00Z" },
      });

      expect(screen.getByText("Starts tomorrow")).toBeVisible();
      expect(screen.getByText(/Oct 1.*3, 2030/)).toBeVisible();
    });
  });

  it("is a region named after the course", () => {
    renderPanel();

    expect(
      screen.getByRole("complementary", {
        name: "Enroll in React Fundamentals",
      }),
    ).toBeVisible();
  });

  it("shows the course's time line, its length, the price and the buy button", () => {
    renderPanel();

    expect(
      // Testing Library's text matching turns the range's thin spaces into plain ones.
      screen.getByText("Tue, Oct 1, 2:00 – 4:00 PM EDT"),
    ).toBeVisible();
    expect(screen.getByText("2 hours")).toBeVisible();
    expect(screen.getByText("$99")).toBeVisible();
    expect(screen.getByRole("button", { name: "Enroll now" })).toBeVisible();
  });

  it("puts the course's time line in one time element with the start time", () => {
    const { container } = renderPanel();

    const timeElements = container.querySelectorAll("time");
    expect(timeElements).toHaveLength(1);
    expect(timeElements[0]).toHaveAttribute("datetime", "2030-10-01T18:00:00Z");
    expect(timeElements[0]).toHaveTextContent("Tue, Oct 1, 2:00 – 4:00 PM EDT");
    expect(screen.queryByText("America/New_York")).not.toBeInTheDocument();
  });

  it("writes the time line in the visitor's locale", () => {
    renderPanel({ locale: "en-GB" });

    expect(screen.getByText("Tue 1 Oct, 14:00–16:00 GMT-4")).toBeVisible();
  });

  it("shows a long course's date range, its start and end, and its length", () => {
    renderPanel({
      schedule: {
        startTime: "2026-12-01T23:00:00Z",
        endTime: "2026-12-04T01:00:00Z",
        timeZone: "America/New_York",
      },
    });

    expect(screen.getByText("Dec 1 – 3, 2026")).toHaveAttribute(
      "datetime",
      "2026-12-01T23:00:00Z",
    );
    expect(
      screen.getByText("Tue, Dec 1, 6:00 PM EST – Thu, Dec 3, 8:00 PM EST"),
    ).toBeVisible();
    expect(screen.getByText("2 days 2 hours")).toBeVisible();
  });

  it("reads time line, price, then the button", () => {
    renderPanel();

    const timeLine = screen.getByText("Tue, Oct 1, 2:00 – 4:00 PM EDT");
    const price = screen.getByText("$99");
    const button = screen.getByRole("button", { name: "Enroll now" });
    const follows = Node.DOCUMENT_POSITION_FOLLOWING;

    expect(timeLine.compareDocumentPosition(price)).toBe(follows);
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

  it("shows the course's length under the date", () => {
    renderEndedPanel();

    expect(screen.getByText("2 hours")).toBeVisible();
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
