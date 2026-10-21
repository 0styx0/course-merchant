import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import type { UpdateCourseRequest } from "types.js";
import {
    findPriceChanges,
    findUpdateRuleViolations,
    isSameInstant,
} from "./course-update-rules.js";

const now = Temporal.Instant.from("2026-10-21T12:00:00Z");

function at(hoursFromNow: number): Temporal.Instant {
    return now.add({ hours: hoursFromNow });
}

function makeStored() {
    return {
        startsAt: at(24),
        endsAt: at(26),
        prices: [
            {
                id: "price_past",
                amount: 5000,
                currency: "USD",
                effectiveAt: at(-48),
            },
            {
                id: "price_future",
                amount: 7000,
                currency: "USD",
                effectiveAt: at(12),
            },
        ],
    };
}

type Stored = ReturnType<typeof makeStored>;

// round-trips the stored course, the way a form would after loading it
function makeRequest(stored: Stored): UpdateCourseRequest {
    return {
        name: "TypeScript Fundamentals",
        description: "Learn TypeScript from the ground up.",
        status: "published",
        schedule: {
            startTime: stored.startsAt.toString(),
            endTime: stored.endsAt.toString(),
            timeZone: "UTC",
        },
        prices: stored.prices.map((price) => ({
            amount: price.amount,
            currency: price.currency,
            effectiveAt: price.effectiveAt.toString(),
        })),
    };
}

describe("isSameInstant", () => {
    it("compares at microsecond precision", () => {
        expect(
            isSameInstant(
                "2026-10-21T12:00:00.000000400Z",
                Temporal.Instant.from("2026-10-21T12:00:00Z"),
            ),
        ).toBe(true);
    });

    it("treats a different microsecond as changed", () => {
        expect(
            isSameInstant(
                "2026-10-21T12:00:00.000001Z",
                Temporal.Instant.from("2026-10-21T12:00:00Z"),
            ),
        ).toBe(false);
    });
});

describe("findUpdateRuleViolations", () => {
    it("accepts an unchanged round-trip", () => {
        const stored = makeStored();

        expect(
            findUpdateRuleViolations({
                request: makeRequest(stored),
                stored,
                now,
            }),
        ).toEqual([]);
    });

    it("accepts unchanged schedule times in the past", () => {
        const stored = {
            ...makeStored(),
            startsAt: at(-3),
            endsAt: at(-1),
        };

        expect(
            findUpdateRuleViolations({
                request: makeRequest(stored),
                stored,
                now,
            }),
        ).toEqual([]);
    });

    it("rejects schedule times changed to the past", () => {
        const stored = makeStored();
        const request = makeRequest(stored);

        request.schedule.startTime = at(-3).toString();
        request.schedule.endTime = at(-2).toString();

        expect(
            findUpdateRuleViolations({ request, stored, now }),
        ).toEqual([
            {
                field: "/schedule/startTime",
                code: "IN_PAST",
                detail: "Start time cannot be in the past.",
            },
            {
                field: "/schedule/endTime",
                code: "IN_PAST",
                detail: "End time cannot be in the past.",
            },
        ]);
    });

    it("rejects a change to a price in effect", () => {
        const stored = makeStored();
        const request = makeRequest(stored);

        request.prices[0].amount = 6000;

        expect(
            findUpdateRuleViolations({ request, stored, now }),
        ).toEqual([
            {
                field: "/prices/0/effectiveAt",
                code: "IN_PAST",
                detail: "Price effective time cannot be in the past.",
            },
        ]);
    });

    it("accepts a change to a future price", () => {
        const stored = makeStored();
        const request = makeRequest(stored);

        request.prices[1].amount = 9000;

        expect(
            findUpdateRuleViolations({ request, stored, now }),
        ).toEqual([]);
    });

    it("accepts an empty price list when a price is in effect", () => {
        const stored = makeStored();

        expect(
            findUpdateRuleViolations({
                request: { ...makeRequest(stored), prices: [] },
                stored,
                now,
            }),
        ).toEqual([]);
    });

    it("rejects an empty price list when no price is in effect", () => {
        const stored = {
            ...makeStored(),
            prices: [makeStored().prices[1]],
        };

        expect(
            findUpdateRuleViolations({
                request: { ...makeRequest(stored), prices: [] },
                stored,
                now,
            }),
        ).toEqual([
            {
                field: "/prices",
                code: "TOO_SHORT",
                detail:
                    "Prices must contain at least one entry when no price is in effect.",
            },
        ]);
    });

    it("reports every violation together", () => {
        const stored = makeStored();
        const request = makeRequest(stored);

        request.schedule.startTime = at(-3).toString();
        request.prices.push({
            amount: 8000,
            currency: "USD",
            effectiveAt: at(-1).toString(),
        });

        expect(
            findUpdateRuleViolations({ request, stored, now }).map(
                (error) => error.field,
            ),
        ).toEqual(["/schedule/startTime", "/prices/2/effectiveAt"]);
    });
});

describe("findPriceChanges", () => {
    it("changes nothing for an unchanged round-trip", () => {
        const stored = makeStored();

        expect(
            findPriceChanges({ request: makeRequest(stored), stored, now }),
        ).toEqual({ newPrices: [], deletePriceIds: [] });
    });

    it("replaces an edited future price", () => {
        const stored = makeStored();
        const request = makeRequest(stored);

        request.prices[1].amount = 9000;

        expect(findPriceChanges({ request, stored, now })).toEqual({
            newPrices: [request.prices[1]],
            deletePriceIds: ["price_future"],
        });
    });

    it("deletes omitted future prices but keeps prices in effect", () => {
        const stored = makeStored();

        expect(
            findPriceChanges({
                request: { ...makeRequest(stored), prices: [] },
                stored,
                now,
            }),
        ).toEqual({ newPrices: [], deletePriceIds: ["price_future"] });
    });

    it("inserts new prices", () => {
        const stored = makeStored();
        const request = makeRequest(stored);
        const newPrice = {
            amount: 9900,
            currency: "USD",
            effectiveAt: at(36).toString(),
        };

        request.prices.push(newPrice);

        expect(findPriceChanges({ request, stored, now })).toEqual({
            newPrices: [newPrice],
            deletePriceIds: [],
        });
    });
});
