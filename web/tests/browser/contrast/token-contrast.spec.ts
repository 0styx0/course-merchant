import { expect, test } from "@playwright/test";
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

test.beforeEach(async ({ page }) => {
  // Any page that loads globals.css works; the 404 page calls no API.
  await page.goto("/no-such-page");
});

for (const { foreground, background, floor } of lightPairs) {
  const pairName = `${foreground} on ${background}`;

  test(`${pairName} reaches ${floor}:1`, async ({ page }) => {
    const foregroundColour =
      foreground === "white" ? white : await readRootToken(page, foreground);
    const backgroundColour = await readRootToken(page, background);

    expect(
      wcagContrast(foregroundColour, backgroundColour),
      `${pairName} needs ${floor}:1`,
    ).toBeGreaterThanOrEqual(floor);
  });
}
