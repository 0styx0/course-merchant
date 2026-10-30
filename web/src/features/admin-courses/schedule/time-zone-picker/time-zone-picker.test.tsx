import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeZonePicker } from "./time-zone-picker";

const timeZones = ["America/New_York", "Asia/Tokyo", "Europe/Paris"];

function renderPicker(value = "America/New_York") {
  const onChange = vi.fn();
  render(
    <label>
      Time zone
      <TimeZonePicker
        timeZones={timeZones}
        value={value}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    </label>,
  );
  return { onChange, user: userEvent.setup() };
}

const input = () => screen.getByRole("combobox", { name: "Time zone" });

describe("TimeZonePicker", () => {
  it("shows the current zone in the box", () => {
    renderPicker("Europe/Paris");
    expect(input()).toHaveValue("Europe/Paris");
  });

  it("lists only matching zones while typing, ignoring case", async () => {
    const { user } = renderPicker();
    await user.clear(input());
    await user.type(input(), "PARIS");
    expect(screen.getByRole("option", { name: "Europe/Paris" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Asia/Tokyo" })).toBeNull();
  });

  it("matches an underscore with a space", async () => {
    const { user } = renderPicker("Europe/Paris");
    await user.clear(input());
    await user.type(input(), "new york");
    expect(
      screen.getByRole("option", { name: "America/New_York" }),
    ).toBeVisible();
  });

  it("ignores spaces around the query", async () => {
    const { user } = renderPicker();
    await user.clear(input());
    await user.type(input(), "  tokyo ");
    expect(screen.getByRole("option", { name: "Asia/Tokyo" })).toBeVisible();
  });

  it("says when nothing matches", async () => {
    const { user } = renderPicker();
    await user.clear(input());
    await user.type(input(), "atlantis");
    expect(screen.getByText("No time zone found")).toBeVisible();
  });

  it("reports the zone that is clicked", async () => {
    const { user, onChange } = renderPicker();
    await user.clear(input());
    await user.type(input(), "tokyo");
    await user.click(screen.getByRole("option", { name: "Asia/Tokyo" }));
    expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
  });

  it("reports the highlighted zone on Enter", async () => {
    const { user, onChange } = renderPicker();
    await user.clear(input());
    await user.type(input(), "paris{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("Europe/Paris");
  });

  it("keeps the zone and restores the text when typing isn't followed by a pick", async () => {
    const { user, onChange } = renderPicker();
    await user.clear(input());
    await user.type(input(), "tok");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue("America/New_York");
  });

  it("restores the text on Escape", async () => {
    const { user } = renderPicker();
    await user.clear(input());
    await user.type(input(), "tok{Escape}");
    expect(input()).toHaveValue("America/New_York");
  });
});
