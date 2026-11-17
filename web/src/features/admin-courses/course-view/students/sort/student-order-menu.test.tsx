import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StudentOrderMenu } from "./student-order-menu";

const sortByMenu = () => screen.getByRole("combobox", { name: "Sort by" });

describe("StudentOrderMenu", () => {
  it("shows the chosen order's label in the trigger, not its stored value", () => {
    render(<StudentOrderMenu order="newest" onOrderChange={vi.fn()} />);

    expect(sortByMenu()).toHaveTextContent("Newest enrolled first");
  });

  it("names the trigger Sort by, from the label beside it", () => {
    render(<StudentOrderMenu order="attention" onOrderChange={vi.fn()} />);

    expect(screen.getByText("Sort by")).toBeVisible();
    expect(sortByMenu()).toBeInTheDocument();
  });

  it("offers the four orders and reports the one the admin picks", async () => {
    const onOrderChange = vi.fn();
    const user = userEvent.setup();
    render(<StudentOrderMenu order="newest" onOrderChange={onOrderChange} />);

    await user.click(sortByMenu());
    const optionNames = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    await user.click(
      await screen.findByRole("option", { name: "Active first" }),
    );

    expect(optionNames).toEqual([
      "Newest enrolled first",
      "Oldest enrolled first",
      "Active first",
      "Needs attention first",
    ]);
    expect(onOrderChange).toHaveBeenCalledWith("active");
  });
});
