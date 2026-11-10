import { expect, test, type Page } from "@playwright/test";
import { wcagContrast } from "culori";

import { readRootToken, white } from "./measure-contrast";

const textFloor = 4.5;
const borderFloor = 3;

/** A colour pair from style guide §11 (light rows only; the dark rows wait for the dark admin): a token name, or "white". */
type TokenPair = {
  foreground: string;
  background: string;
  floor: number;
};

/** Mirrors the §11 table by hand: a pair missing here goes unchecked, so add a row with each new pair. */
const lightPairs: TokenPair[] = [
  ...["--background", "--surface-alt", "--card"].map((background) => ({
    foreground: "--foreground",
    background,
    floor: textFloor,
  })),
  ...["--background", "--surface-alt"].flatMap((background) => [
    { foreground: "--muted-foreground", background, floor: textFloor },
    { foreground: "--olive", background, floor: textFloor },
    { foreground: "--destructive", background, floor: textFloor },
    { foreground: "--input", background, floor: borderFloor },
  ]),
  {
    foreground: "--primary-foreground",
    background: "--primary",
    floor: textFloor,
  },
  {
    foreground: "--secondary-foreground",
    background: "--secondary",
    floor: textFloor,
  },
  {
    foreground: "--primary-foreground",
    background: "--primary-hover",
    floor: textFloor,
  },
  {
    foreground: "--secondary-foreground",
    background: "--secondary-hover",
    floor: textFloor,
  },
  {
    foreground: "--surface-dark-foreground",
    background: "--surface-dark",
    floor: textFloor,
  },
  { foreground: "white", background: "--destructive", floor: textFloor },
  {
    foreground: "--success-foreground",
    background: "--success",
    floor: textFloor,
  },
  { foreground: "--input", background: "--card", floor: borderFloor },
  { foreground: "--ring", background: "--background", floor: borderFloor },
  {
    foreground: "--secondary",
    background: "--surface-dark",
    floor: borderFloor,
  },
  { foreground: "--primary", background: "--secondary", floor: borderFloor },
  { foreground: "--primary", background: "--background", floor: borderFloor },
  { foreground: "--success", background: "--background", floor: borderFloor },
  { foreground: "--success", background: "--card", floor: borderFloor },
  ...["--chart-1", "--chart-2", "--chart-3"].map((foreground) => ({
    foreground,
    background: "--background",
    floor: borderFloor,
  })),
];

/** "white" names the literal colour; anything else names a root token. */
function readForeground(page: Page, foreground: string) {
  if (foreground === "white") return Promise.resolve(white);
  return readRootToken(page, foreground);
}

// The pairs only read root tokens, so one page load serves them all; soft
// checks report every failing pair, not just the first.
test("every §11 colour pair reaches its contrast floor", async ({ page }) => {
  // Any page that loads globals.css works; the 404 page calls no API.
  await page.goto("/no-such-page");

  for (const { foreground, background, floor } of lightPairs) {
    const pairName = `${foreground} on ${background}`;
    const foregroundColour = await readForeground(page, foreground);
    const backgroundColour = await readRootToken(page, background);

    expect
      .soft(
        wcagContrast(foregroundColour, backgroundColour),
        `${pairName} needs ${floor}:1`,
      )
      .toBeGreaterThanOrEqual(floor);
  }
});
