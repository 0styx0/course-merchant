import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Course } from "@/lib/types";
import { StartWords } from "./start-words";

const serverWords = "Starts Jan 25, 2030";

function makeScheduleStarting(startTime: string): Course["schedule"] {
  return { startTime, endTime: "2030-02-01T00:00:00Z", timeZone: "UTC" };
}

function setBrowserZone(timeZone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

function renderWords(startTime: string) {
  render(
    <StartWords
      schedule={makeScheduleStarting(startTime)}
      serverWords={serverWords}
    />,
  );
}

describe("StartWords", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2030-01-10T12:00:00Z"));
    setBrowserZone("UTC");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["2030-01-10T15:00:00Z", "Starts today"],
    ["2030-01-11T15:00:00Z", "Starts tomorrow"],
    ["2030-01-12T15:00:00Z", "Starts in 2 days"],
    ["2030-01-24T15:00:00Z", "Starts in 14 days"],
  ])("reads %s as %s", (startTime, words) => {
    renderWords(startTime);

    expect(screen.getByText(words)).toBeVisible();
  });

  it("keeps the server's words 15 days ahead", () => {
    renderWords("2030-01-25T15:00:00Z");

    expect(screen.getByText(serverWords)).toBeVisible();
  });

  it("keeps the server's words once the start has passed", () => {
    renderWords("2030-01-10T11:00:00Z");

    expect(screen.getByText(serverWords)).toBeVisible();
  });

  it("counts the visitor's calendar days: 11 PM before a 1 AM start is tomorrow", () => {
    setBrowserZone("Pacific/Auckland");
    vi.setSystemTime(new Date("2030-01-10T10:00:00Z")); // 23:00 on 10 Jan in Auckland
    renderWords("2030-01-10T12:00:00Z"); // 01:00 on 11 Jan in Auckland

    expect(screen.getByText("Starts tomorrow")).toBeVisible();
  });

  it("keeps the server's words when the browser's zone is unusable", () => {
    setBrowserZone("Not/AZone");
    renderWords("2030-01-11T15:00:00Z");

    expect(screen.getByText(serverWords)).toBeVisible();
  });

  it("gives the server's words in the server render", () => {
    const html = renderToString(
      <StartWords
        schedule={makeScheduleStarting("2030-01-11T15:00:00Z")}
        serverWords={serverWords}
      />,
    );

    expect(html).toContain(serverWords);
  });
});
