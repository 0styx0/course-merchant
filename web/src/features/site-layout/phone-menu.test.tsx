import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PhoneMenu } from "./phone-menu";

function menuButton() {
  return screen.getByRole("button", { name: "Menu" });
}

function findMenuSheet() {
  return screen.findByRole("dialog", { name: "Menu" });
}

async function openMenuSheet() {
  const user = userEvent.setup();
  render(<PhoneMenu />);
  await user.click(menuButton());
  const sheet = await findMenuSheet();
  return { user, sheet };
}

function expectMenuSheetClosed() {
  return waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

function expectFocusInside(sheet: HTMLElement) {
  return waitFor(() =>
    expect(sheet.contains(document.activeElement)).toBe(true),
  );
}

describe("PhoneMenu", () => {
  it("starts closed, showing only the Menu button", () => {
    render(<PhoneMenu />);

    expect(menuButton()).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a Menu button at least 44px tall and wide", () => {
    render(<PhoneMenu />);

    expect(menuButton()).toHaveClass("size-11");
  });

  it("opens a sheet with Courses in a 48px row and moves focus inside", async () => {
    const { sheet } = await openMenuSheet();

    const coursesLink = within(sheet).getByRole("link", { name: "Courses" });
    expect(coursesLink).toHaveClass("min-h-12");
    await expectFocusInside(sheet);
  });

  it("moves Tab and Shift+Tab between the sheet's Courses link and Close button", async () => {
    const { user, sheet } = await openMenuSheet();
    const coursesLink = within(sheet).getByRole("link", { name: "Courses" });
    const closeButton = within(sheet).getByRole("button", { name: "Close" });
    await expectFocusInside(sheet);

    await user.keyboard("{Tab}");
    expect(closeButton).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(coursesLink).toHaveFocus();
  });

  it("closes on Escape and returns focus to Menu", async () => {
    const { user } = await openMenuSheet();

    await user.keyboard("{Escape}");

    await expectMenuSheetClosed();
    expect(menuButton()).toHaveFocus();
  });

  it("closes from the close button and returns focus to Menu", async () => {
    const { user, sheet } = await openMenuSheet();

    await user.click(within(sheet).getByRole("button", { name: "Close" }));

    await expectMenuSheetClosed();
    expect(menuButton()).toHaveFocus();
  });

  it("closes when the visitor taps Courses, a link to the home page", async () => {
    const { user, sheet } = await openMenuSheet();
    const coursesLink = within(sheet).getByRole("link", { name: "Courses" });

    expect(coursesLink).toHaveAttribute("href", "/");
    await user.click(coursesLink);

    await expectMenuSheetClosed();
    expect(menuButton()).toHaveFocus();
  });
});
