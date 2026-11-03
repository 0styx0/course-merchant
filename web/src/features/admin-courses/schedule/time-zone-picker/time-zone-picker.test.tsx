import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TimeZonePicker } from "./time-zone-picker";

const timeZones = ["America/New_York", "Asia/Tokyo", "Europe/Paris"];

function StatefulPicker({
  firstValue,
  onChange,
}: {
  firstValue: string;
  onChange: (timeZone: string) => void;
}) {
  const [value, setValue] = useState(firstValue);
  return (
    <TimeZonePicker
      timeZones={timeZones}
      value={value}
      onChange={(timeZone) => {
        onChange(timeZone);
        setValue(timeZone);
      }}
      onBlur={vi.fn()}
    />
  );
}

function renderPicker(value = "America/New_York") {
  const onChange = vi.fn();
  const onSubmit = vi.fn((event: React.SubmitEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <label>
        Time zone
        <StatefulPicker firstValue={value} onChange={onChange} />
      </label>
      <button type="submit">Save</button>
    </form>,
  );
  return { onChange, onSubmit, user: userEvent.setup() };
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

  it("picks the first match on Enter without submitting the form", async () => {
    const { user, onChange, onSubmit } = renderPicker();
    await user.clear(input());
    await user.type(input(), "paris{Enter}");
    expect(onChange).toHaveBeenCalledWith("Europe/Paris");
    expect(input()).toHaveValue("Europe/Paris");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes the list on Enter with no match, picking and submitting nothing", async () => {
    const { user, onChange, onSubmit } = renderPicker();
    await user.clear(input());
    await user.type(input(), "atlantis{Enter}");
    expect(screen.queryByText("No time zone found")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Enter with the list closed and the box untouched", async () => {
    const { user, onSubmit } = renderPicker();
    await user.click(input());
    await user.keyboard("{Escape}{Enter}");
    expect(input()).toHaveValue("America/New_York");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("still picks the zone marked with ArrowDown on Enter", async () => {
    const { user, onChange, onSubmit } = renderPicker();
    await user.clear(input());
    await user.type(input(), "o{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("Asia/Tokyo");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves an Enter that confirms an input-method composition alone", async () => {
    renderPicker();
    const isNotPrevented = fireEvent.keyDown(input(), {
      key: "Enter",
      keyCode: 229,
    });
    expect(isNotPrevented).toBe(true);
  });

  it("closes the list on Escape and shows the chosen zone", async () => {
    const { user, onChange } = renderPicker();
    await user.clear(input());
    await user.type(input(), "tok{Escape}");
    expect(screen.queryByRole("option")).toBeNull();
    expect(input()).toHaveValue("America/New_York");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the chosen zone in the box on a second Escape", async () => {
    const { user, onChange } = renderPicker();
    await user.clear(input());
    await user.type(input(), "tok{Escape}{Escape}");
    expect(input()).toHaveValue("America/New_York");
    expect(onChange).not.toHaveBeenCalled();
  });
});
