import type { Page } from "@playwright/test";
import { parse, rgb, type Rgb } from "culori";

export const white: Rgb = { mode: "rgb", r: 1, g: 1, b: 1 };

/** Culori reads the oklab(), oklch() and color() strings Chromium computes. */
export function toRgb(computedColor: string): Rgb {
  const parsed = rgb(parse(computedColor));
  if (!parsed) throw new Error(`Cannot read the colour "${computedColor}"`);
  return parsed;
}

/** Lays a colour with see-through parts over a solid one. */
export function compositeOver(top: Rgb, bottom: Rgb): Rgb {
  const alpha = top.alpha ?? 1;
  return {
    mode: "rgb",
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
  };
}

/** The colour a root token resolves to; a token the page lacks names itself in the error. */
export async function readRootToken(page: Page, tokenName: string) {
  const value = await page.evaluate(
    (name) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    tokenName,
  );
  if (value === "") {
    throw new Error(`The page defines no token ${tokenName}`);
  }
  return toRgb(value);
}
