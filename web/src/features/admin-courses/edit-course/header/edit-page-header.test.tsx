import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditPageHeader, isShownInShop } from "./edit-page-header";

describe("EditPageHeader", () => {
  it("shows the saved name and the status label", () => {
    render(
      <EditPageHeader
        courseId="c1"
        name="Intro to Go"
        statusName="drafted"
        isInShop={false}
      />,
    );

    expect(screen.getByText("Intro to Go")).toBeInTheDocument();
    expect(screen.getByText("Drafted")).toBeInTheDocument();
  });

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
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("isShownInShop", () => {
  it.each([
    ["published", 1, true],
    ["published", 2, true],
    ["published", 0, false],
    ["drafted", 1, false],
    ["archived", 1, false],
    ["deleted", 1, false],
  ] as const)(
    "%s with %i prices in effect gives %s",
    (status, count, isShown) => {
      expect(isShownInShop(status, count)).toBe(isShown);
    },
  );
});
