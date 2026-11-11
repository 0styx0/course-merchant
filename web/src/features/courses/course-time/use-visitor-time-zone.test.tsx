import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVisitorTimeZone } from "./use-visitor-time-zone";

function ZoneName() {
  return <p>{useVisitorTimeZone() ?? "no zone"}</p>;
}

describe("useVisitorTimeZone", () => {
  beforeEach(() => {
    // React's act() warns unless the test environment says it supports it.
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("gives no zone in the server render", () => {
    expect(renderToString(<ZoneName />)).toContain("no zone");
  });

  it("gives the browser's zone after hydration, with no hydration warning", async () => {
    const consoleError = vi.spyOn(console, "error");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ZoneName />);
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Asia/Tokyo",
    } as Intl.ResolvedDateTimeFormatOptions);

    await act(async () => {
      hydrateRoot(container, <ZoneName />);
    });

    expect(container.textContent).toBe("Asia/Tokyo");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
