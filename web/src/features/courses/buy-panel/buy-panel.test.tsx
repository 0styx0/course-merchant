import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { freeCourse, reactCourse } from "@/mocks/fixtures/courses";
import { BuyPanel } from "./buy-panel";

function renderPanel(props: Partial<Parameters<typeof BuyPanel>[0]> = {}) {
  return render(
    <BuyPanel
      courseName={reactCourse.name}
      schedule={reactCourse.schedule}
      price="$99"
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
});
