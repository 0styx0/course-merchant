import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { editCoursePath } from "@/features/admin-courses/addresses/admin-course-path";
import { shopCoursePath } from "@/features/courses/shop-course-path";
import {
  adminCourseWithFuturePrice,
  draftedAdminCourse,
  publishedAdminCourse,
} from "@/mocks/fixtures/admin-courses";
import type { AdminCourse } from "@/lib/types";

import { CourseAdminPanel } from "./course-admin-panel";

const renderMs = Date.parse("2026-11-01T00:00:00Z");

function renderPanel(course: AdminCourse) {
  render(<CourseAdminPanel course={course} renderMs={renderMs} />);
}

function withStatus(
  course: AdminCourse,
  name: AdminCourse["status"]["name"],
): AdminCourse {
  return { ...course, status: { ...course.status, name } };
}

const futurePrice = {
  id: "0b7a9c3e-1f2d-4e5a-8b6c-7d8e9f0a1b2c",
  amount: 12900,
  currency: "USD",
  effectiveAt: "2099-03-01T14:00:00Z",
} as const;

describe("CourseAdminPanel", () => {
  describe("status pill", () => {
    it("shows Published in the success colours", () => {
      renderPanel(publishedAdminCourse);

      expect(screen.getByText("Published")).toHaveClass(
        "bg-success",
        "text-success-foreground",
      );
    });

    it.each([
      ["drafted", "Drafted"],
      ["archived", "Archived"],
      ["deleted", "Deleted"],
    ] as const)("shows %s in the muted colours", (name, word) => {
      renderPanel(withStatus(draftedAdminCourse, name));

      expect(screen.getByText(word)).toHaveClass(
        "bg-muted",
        "text-muted-foreground",
      );
    });
  });

  describe("times", () => {
    it("shows the start and end in the course's zone and names the zone", () => {
      renderPanel(draftedAdminCourse);

      expect(screen.getByText("Starts Oct 1, 2026, 2:00 PM")).toBeVisible();
      expect(screen.getByText("Ends Oct 1, 2026, 4:00 PM")).toBeVisible();
      expect(screen.getByText("Times in America/New_York")).toBeVisible();
    });

    it("shows the wall-clock time of a zone other than New York", () => {
      renderPanel({
        ...draftedAdminCourse,
        schedule: { ...draftedAdminCourse.schedule, timeZone: "Asia/Tokyo" },
      });

      expect(screen.getByText("Starts Oct 2, 2026, 3:00 AM")).toBeVisible();
      expect(screen.getByText("Times in Asia/Tokyo")).toBeVisible();
    });
  });

  describe("prices", () => {
    it("shows the price in effect", () => {
      renderPanel(draftedAdminCourse);

      expect(screen.getByText("Price now: $99.00")).toBeVisible();
      expect(screen.queryByText("Scheduled prices")).toBeNull();
    });

    it("reads a price of 0 as Free", () => {
      renderPanel({
        ...draftedAdminCourse,
        prices: [{ ...draftedAdminCourse.prices[0], amount: 0 }],
      });

      expect(screen.getByText("Price now: Free")).toBeVisible();
    });

    it("lists a scheduled price with its start", () => {
      renderPanel(adminCourseWithFuturePrice);

      expect(
        screen.getByRole("heading", { name: "Scheduled prices" }),
      ).toBeVisible();
      expect(screen.getByRole("listitem").textContent).toBe(
        "$129.00 from Mar 1, 2099, 9:00 AM",
      );
    });

    it("lists several scheduled prices in start order, whatever order the API sends", () => {
      renderPanel({
        ...adminCourseWithFuturePrice,
        prices: [
          {
            ...futurePrice,
            id: "5d0c1f4e-8a3b-4c6d-9e7f-1a2b3c4d5e6f",
            amount: 0,
            effectiveAt: "2099-06-01T14:00:00Z",
          },
          ...adminCourseWithFuturePrice.prices,
        ],
      });

      expect(
        screen.getAllByRole("listitem").map((row) => row.textContent),
      ).toEqual([
        "$129.00 from Mar 1, 2099, 9:00 AM",
        "Free from Jun 1, 2099, 10:00 AM",
      ]);
    });

    it("shows the latest started price as the price now, whatever order the API sends", () => {
      renderPanel({
        ...draftedAdminCourse,
        prices: [
          {
            ...draftedAdminCourse.prices[0],
            amount: 5000,
            effectiveAt: "2026-10-20T00:00:00Z",
          },
          draftedAdminCourse.prices[0],
        ],
      });

      expect(screen.getByText("Price now: $50.00")).toBeVisible();
    });

    it("says no price is in effect yet and lists only scheduled prices", () => {
      renderPanel({ ...draftedAdminCourse, prices: [futurePrice] });

      expect(screen.getByText("No price in effect yet")).toBeVisible();
      expect(screen.queryByText(/Price now/)).toBeNull();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("counts a price that starts exactly at the render time as in effect", () => {
      renderPanel({
        ...draftedAdminCourse,
        prices: [
          {
            ...draftedAdminCourse.prices[0],
            effectiveAt: "2026-11-01T00:00:00Z",
          },
        ],
      });

      expect(screen.getByText("Price now: $99.00")).toBeVisible();
      expect(screen.queryByText("Scheduled prices")).toBeNull();
    });
  });

  it("shows the private course link as text, not a link", () => {
    renderPanel(draftedAdminCourse);

    expect(
      screen.getByText("Course link: https://example.com/course"),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: /example\.com/ })).toBeNull();
  });

  it("links to the edit page", () => {
    renderPanel(draftedAdminCourse);

    expect(screen.getByRole("link", { name: "Edit course" })).toHaveAttribute(
      "href",
      editCoursePath(draftedAdminCourse.id),
    );
  });

  describe("View public page link", () => {
    it("opens the shop page of a published course with a price in effect", () => {
      renderPanel(publishedAdminCourse);

      expect(
        screen.getByRole("link", { name: "View public page" }),
      ).toHaveAttribute("href", shopCoursePath(publishedAdminCourse.id));
    });

    it.each(["drafted", "archived", "deleted"] as const)(
      "is absent for a %s course",
      (name) => {
        renderPanel(withStatus(publishedAdminCourse, name));

        expect(screen.getByRole("link", { name: "Edit course" })).toBeVisible();
        expect(
          screen.queryByRole("link", { name: "View public page" }),
        ).toBeNull();
      },
    );

    it("is absent for a published course whose prices all start later", () => {
      renderPanel({ ...publishedAdminCourse, prices: [futurePrice] });

      expect(screen.getByRole("link", { name: "Edit course" })).toBeVisible();
      expect(
        screen.queryByRole("link", { name: "View public page" }),
      ).toBeNull();
    });
  });
});
