import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CopyAddressesButton } from "./copy-addresses-button";

const fourAddresses = [
  "dana@example.com",
  "omar@example.com",
  "noa@example.com",
  "sam@example.com",
];

async function clickCopy(addresses: string[]) {
  const user = userEvent.setup();
  render(<CopyAddressesButton emails={addresses} />);
  await user.click(
    screen.getByRole("button", { name: "Copy active students' addresses" }),
  );
}

describe("CopyAddressesButton", () => {
  it("copies the addresses joined by commas", async () => {
    await clickCopy(fourAddresses);

    await expect(navigator.clipboard.readText()).resolves.toBe(
      "dana@example.com, omar@example.com, noa@example.com, sam@example.com",
    );
  });

  it("says how many addresses it copied", async () => {
    await clickCopy(fourAddresses);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Copied all 4 active students' addresses.",
    );
  });

  it("says student's address when it copied one", async () => {
    await clickCopy(["dana@example.com"]);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Copied all 1 active student's address.",
    );
  });
});
