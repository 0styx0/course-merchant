import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { problemResponse } from "@/mocks/problem-response";
import { FROZEN_NOW } from "@/test/frozen-now";
import {
  updateCourseSuccess,
  updateCourseUrl,
} from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import type {
  EditCourseFormValues,
  LoadedPrices,
} from "../../validation/edit-course-form-schema";
import {
  captureBody,
  courseId,
  loadedPrices,
  loadedSchedule,
  validValues,
} from "./save-edited-details.action.fixtures";
import { saveEditedDetailsAction } from "./save-edited-details.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));
// `refresh` throws outside a running Server Action
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const ONE_MINUTE_MS = 60_000;

/** A loaded future price whose stored time has seconds, as create's "when saved" leaves. */
const loadedFuturePrice = {
  amount: 12900,
  currency: "USD",
  effectiveAt: "2027-01-01T14:00:30Z",
} as const;

const pricesWithOneFuture: LoadedPrices = {
  ...loadedPrices,
  future: [loadedFuturePrice],
};

/** The row the edit page shows for the loaded future price, in America/New_York. */
const untouchedRow = {
  amountDollars: "129.00",
  effectiveDate: "2027-01-01",
  effectiveTimeOfDay: "09:00",
};

function saveWithPriceRows(
  priceRows: EditCourseFormValues["prices"],
  pricesLoaded: LoadedPrices = pricesWithOneFuture,
) {
  return saveEditedDetailsAction(
    courseId,
    { ...validValues, prices: priceRows },
    loadedSchedule,
    pricesLoaded,
  );
}

describe("saveEditedDetailsAction prices", () => {
  beforeEach(() => {
    server.use(updateCourseSuccess);
  });

  it("sends an untouched row as its loaded price, then the prices in effect", async () => {
    const sent = captureBody();

    await expect(saveWithPriceRows([untouchedRow])).resolves.toEqual({
      state: "success",
      data: { courseId },
    });

    expect(sent.body).toMatchObject({
      prices: [loadedFuturePrice, ...loadedPrices.inEffect],
    });
  });

  it("sends an edited amount as a new price in place of the loaded one", async () => {
    const sent = captureBody();

    await saveWithPriceRows([{ ...untouchedRow, amountDollars: "139.00" }]);

    expect(sent.body).toMatchObject({
      prices: [
        { amount: 13900, currency: "USD", effectiveAt: "2027-01-01T14:00:00Z" },
        ...loadedPrices.inEffect,
      ],
    });
  });

  it("sends a row with an empty date and time as a minute from now", async () => {
    const sent = captureBody();

    await saveWithPriceRows([
      { amountDollars: "49", effectiveDate: "", effectiveTimeOfDay: "" },
    ]);

    expect(sent.body).toMatchObject({
      prices: [
        {
          amount: 4900,
          currency: "USD",
          effectiveAt: new Date(FROZEN_NOW + ONE_MINUTE_MS).toISOString(),
        },
        ...loadedPrices.inEffect,
      ],
    });
  });

  it("sends only the prices in effect when there are no rows", async () => {
    const sent = captureBody();

    await saveWithPriceRows([]);

    expect(sent.body).toMatchObject({ prices: loadedPrices.inEffect });
  });

  it("refuses a changed row in the past without calling the API", async () => {
    const sent = captureBody();

    const result = await saveWithPriceRows([
      { ...untouchedRow, effectiveDate: "2026-10-01" },
    ]);

    expect(sent.calls).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [
          {
            path: "prices.0.effectiveDate",
            message:
              "Choose a date that isn't in the past, or leave both empty to start when you save.",
          },
        ],
      },
    });
  });

  it("refuses no rows when no price is in effect, without calling the API", async () => {
    const sent = captureBody();

    const result = await saveWithPriceRows([], { inEffect: [], future: [] });

    expect(sent.calls).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        fieldErrors: [{ path: "prices", message: "Add at least one price." }],
      },
    });
  });

  it("puts the API's error on a price's time onto that row's time box", async () => {
    const priceTimeRefused = {
      title: "Validation failed",
      detail: "The request contains 1 invalid field.",
      code: "VALIDATION_FAILED",
      errors: [
        {
          field: "/prices/0/effectiveAt",
          code: "IN_PAST",
          detail: "Price must take effect in the future.",
        },
      ],
    };
    server.use(
      http.put(updateCourseUrl, () => problemResponse(400, priceTimeRefused)),
    );

    await expect(saveWithPriceRows([untouchedRow])).resolves.toMatchObject({
      state: "failure",
      error: {
        fieldErrors: [
          {
            path: "prices.0.effectiveTimeOfDay",
            message: "Price must take effect in the future.",
          },
        ],
      },
    });
  });
});
