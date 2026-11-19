import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CopyAddresses } from "./copy-addresses";

const fourAddresses = [
  "dana@example.com",
  "omar@example.com",
  "noa@example.com",
  "sam@example.com",
];

const refusedCopyWords =
  "Couldn't copy the addresses. Your browser blocked the clipboard; click again or allow clipboard access.";

function copyButton() {
  return screen.getByRole("button", {
    name: "Copy active students' addresses",
  });
}

async function clickCopy(addresses: string[]) {
  const user = userEvent.setup();
  render(<CopyAddresses emails={addresses} />);
  await user.click(copyButton());
  return user;
}

describe("CopyAddresses", () => {
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
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says student's address when it copied one", async () => {
    await clickCopy(["dana@example.com"]);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Copied all 1 active student's address.",
    );
  });

  it("disables itself and says so when no student is Active", () => {
    render(<CopyAddresses emails={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No active students to copy.",
    );
    expect(copyButton()).toBeDisabled();
  });

  it("shows an alert saying why when the browser refuses the copy", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new DOMException("Write permission denied.", "NotAllowedError"),
    );
    render(<CopyAddresses emails={fourAddresses} />);

    await user.click(copyButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      refusedCopyWords,
    );
  });

  it("shows the same alert when the browser has no clipboard", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined!);
    render(<CopyAddresses emails={fourAddresses} />);

    await user.click(copyButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      refusedCopyWords,
    );
  });

  it("swaps the alert for the Copied note when a later click works", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new DOMException("Write permission denied.", "NotAllowedError"),
    );
    render(<CopyAddresses emails={fourAddresses} />);
    await user.click(copyButton());
    await screen.findByRole("alert");

    await user.click(copyButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Copied all 4 active students' addresses.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
