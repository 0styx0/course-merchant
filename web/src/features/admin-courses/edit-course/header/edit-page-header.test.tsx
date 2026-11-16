import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditPageHeader } from "./edit-page-header";

describe("EditPageHeader", () => {
  it.each([
    ["published", "Published"],
    ["drafted", "Drafted"],
    ["archived", "Archived"],
    ["deleted", "Deleted"],
  ] as const)(
    "shows the saved name and the %s status as %s",
    (statusName, label) => {
      render(
        <EditPageHeader
          courseId="c1"
          name="Intro to Go"
          statusName={statusName}
          isInShop={false}
        />,
      );

      expect(screen.getByText("Intro to Go")).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it("links to the shop page when the shop shows the course", () => {
    render(
      <EditPageHeader
        courseId="c1"
        name="Intro to Go"
        statusName="published"
        isInShop
      />,
    );

    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View in the shop" }),
    ).toHaveAttribute("href", "/courses/c1");
    expect(screen.queryByText("Not in the shop")).not.toBeInTheDocument();
  });

  it("says the course is not in the shop and shows no link", () => {
    render(
      <EditPageHeader
        courseId="c1"
        name="Intro to Go"
        statusName="published"
        isInShop={false}
      />,
    );

    expect(screen.getByText("Not in the shop")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View in the shop" })).toBeNull();
  });

  it("links to the course's admin page", () => {
    render(
      <EditPageHeader
        courseId="c1"
        name="Intro to Go"
        statusName="drafted"
        isInShop={false}
      />,
    );

    expect(screen.getByRole("link", { name: "View course" })).toHaveAttribute(
      "href",
      "/admin/courses/c1",
    );
  });
});
