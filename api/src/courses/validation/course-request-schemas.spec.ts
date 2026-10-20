import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { createCourseRequestSchema } from "./course-request-schemas.js";

type CourseRequestInput = {
    name: string;
    description: string;
    status: "published" | "archived" | "drafted";
    schedule: {
        startTime: string;
        endTime: string;
        timeZone: string;
    };
    prices: Array<{
        amount: number;
        currency: string;
        effectiveAt: string;
    }>;
};

type IssueLike = {
    code: string;
    path: PropertyKey[];
    message: string;
};

function utcIn(hoursFromNow: number): string {
    return Temporal.Now.instant().add({ hours: hoursFromNow }).toString();
}

function makeValidRequest(): CourseRequestInput {
    const startTime = utcIn(24);

    return {
        name: "TypeScript Fundamentals",
        description: "Learn TypeScript from the ground up.",
        status: "published",
        schedule: {
            startTime,
            endTime: Temporal.Instant.from(startTime)
                .add({ hours: 1 })
                .toString(),
            timeZone: "UTC",
        },
        prices: [
            {
                amount: 5000,
                currency: "USD",
                effectiveAt: utcIn(2),
            },
        ],
    };
}

function makePrice(effectiveAt: string) {
    return {
        amount: 5000,
        currency: "USD",
        effectiveAt,
    };
}

function getIssues(input: unknown) {
    const result = createCourseRequestSchema.safeParse(input);

    expect(result.success).toBe(false);

    if (result.success) {
        throw new Error("Expected request validation to fail.");
    }

    return result.error.issues;
}

function hasPath(
    actualPath: PropertyKey[],
    expectedPath: readonly (string | number)[],
): boolean {
    return (
        actualPath.length === expectedPath.length &&
        actualPath.every((part, index) => part === expectedPath[index])
    );
}

function expectIssueAt(
    issues: readonly IssueLike[],
    path: readonly (string | number)[],
    message?: string,
): void {
    const issue = issues.find((candidate) => hasPath(candidate.path, path));

    expect(issue, `Expected a validation issue at ${JSON.stringify(path)}`)
        .toBeDefined();

    if (message !== undefined) {
        expect(issue?.message).toBe(message);
    }
}

function expectUnknownKeyIssue(
    issues: readonly IssueLike[],
    path: readonly (string | number)[],
): void {
    expect(
        issues.some(
            (issue) =>
                issue.code === "unrecognized_keys" &&
                hasPath(issue.path, path),
        ),
    ).toBe(true);
}

describe("createCourseRequestSchema", () => {
    describe("valid requests", () => {
        it("accepts a complete valid request", () => {
            const result = createCourseRequestSchema.safeParse(
                makeValidRequest(),
            );

            expect(result.success).toBe(true);
        });

        it("returns trimmed course details", () => {
            const request = makeValidRequest();

            request.name = "  TypeScript Fundamentals  ";
            request.description = "  Learn TypeScript.  ";

            const result = createCourseRequestSchema.safeParse(request);

            expect(result.success).toBe(true);

            if (result.success) {
                expect(result.data.name).toBe("TypeScript Fundamentals");
                expect(result.data.description).toBe("Learn TypeScript.");
            }
        });

        it("accepts a zero-priced course", () => {
            const request = makeValidRequest();
            request.prices[0].amount = 0;

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });

        it("accepts multiple prices with distinct effective times", () => {
            const request = makeValidRequest();

            request.prices = [
                makePrice(utcIn(2)),
                makePrice(utcIn(3)),
                makePrice(utcIn(4)),
            ];

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });

        it("accepts canonical UTC timestamps ending in Z", () => {
            const request = makeValidRequest();

            request.schedule.startTime = "2030-01-01T18:00:00Z";
            request.schedule.endTime = "2030-01-01T19:00:00Z";
            request.prices[0].effectiveAt = "2030-01-01T17:00:00Z";

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });

        it("accepts canonical UTC timestamps with fractional seconds", () => {
            const request = makeValidRequest();

            request.schedule.startTime = "2030-01-01T18:00:00.123Z";
            request.schedule.endTime = "2030-01-01T19:00:00.456Z";
            request.prices[0].effectiveAt = "2030-01-01T17:00:00.789Z";

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });
    });

    describe("required fields", () => {
        it.each([
            "name",
            "description",
            "status",
            "schedule",
            "prices",
        ] as const)("requires %s", (field) => {
            const request: Record<string, unknown> = {
                ...makeValidRequest(),
            };

            delete request[field];

            const issues = getIssues(request);

            expectIssueAt(issues, [field]);
        });

        it.each([
            ["name", null],
            ["description", null],
            ["status", null],
            ["schedule", null],
            ["prices", null],
        ] as const)("rejects null for %s", (field, value) => {
            const request = {
                ...makeValidRequest(),
                [field]: value,
            };

            const issues = getIssues(request);

            expectIssueAt(issues, [field]);
        });

        it("rejects a status that is not allowed during creation", () => {
            const request = {
                ...makeValidRequest(),
                status: "deleted",
            };

            const issues = getIssues(request);

            expectIssueAt(issues, ["status"]);
        });

        it("rejects an empty prices array", () => {
            const request = makeValidRequest();
            request.prices = [];

            const issues = getIssues(request);

            expectIssueAt(issues, ["prices"]);
        });
    });

    describe("nested object structure", () => {
        it.each([
            "startTime",
            "endTime",
            "timeZone",
        ] as const)("requires schedule.%s", (field) => {
            const schedule: Record<string, unknown> = {
                ...makeValidRequest().schedule,
            };

            delete schedule[field];

            const issues = getIssues({
                ...makeValidRequest(),
                schedule,
            });

            expectIssueAt(issues, ["schedule", field]);
        });

        it.each([
            "amount",
            "currency",
            "effectiveAt",
        ] as const)("requires prices[0].%s", (field) => {
            const price: Record<string, unknown> = {
                ...makeValidRequest().prices[0],
            };

            delete price[field];

            const issues = getIssues({
                ...makeValidRequest(),
                prices: [price],
            });

            expectIssueAt(issues, ["prices", 0, field]);
        });

        it("rejects an invalid schedule time", () => {
            const request = makeValidRequest();

            request.schedule.startTime = "not-a-date";

            const issues = getIssues(request);

            expectIssueAt(issues, ["schedule", "startTime"]);
        });

        it("rejects an invalid price amount", () => {
            const request = makeValidRequest();
            request.prices[0].amount = 49;

            const issues = getIssues(request);

            expectIssueAt(issues, ["prices", 0, "amount"]);
        });

        it("rejects a price entry that is not an object", () => {
            const request = {
                ...makeValidRequest(),
                prices: [null],
            };

            const issues = getIssues(request);

            expectIssueAt(issues, ["prices", 0]);
        });
    });

    describe("unknown properties", () => {
        it("rejects unknown top-level properties", () => {
            const issues = getIssues({
                ...makeValidRequest(),
                unexpectedField: true,
            });

            expectUnknownKeyIssue(issues, []);
        });

        it("rejects unknown schedule properties", () => {
            const request = makeValidRequest();

            const issues = getIssues({
                ...request,
                schedule: {
                    ...request.schedule,
                    unexpectedField: true,
                },
            });

            expectUnknownKeyIssue(issues, ["schedule"]);
        });

        it("rejects unknown price properties", () => {
            const request = makeValidRequest();

            const issues = getIssues({
                ...request,
                prices: [
                    {
                        ...request.prices[0],
                        unexpectedField: true,
                    },
                ],
            });

            expectUnknownKeyIssue(issues, ["prices", 0]);
        });
    });

    describe("schedule range", () => {
        it("rejects an end time earlier than the start time", () => {
            const request = makeValidRequest();

            request.schedule.startTime = utcIn(26);
            request.schedule.endTime = utcIn(25);

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["schedule", "endTime"],
                "End time must be after start time.",
            );
        });

        it("rejects an end time equal to the start time", () => {
            const request = makeValidRequest();

            request.schedule.endTime = request.schedule.startTime;

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["schedule", "endTime"],
                "End time must be after start time.",
            );
        });

        it("accepts an end time later than the start time", () => {
            const request = makeValidRequest();

            request.schedule.endTime = Temporal.Instant
                .from(request.schedule.startTime)
                .add({ hours: 2 })
                .toString();

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });
    });

    describe("schedule timestamps", () => {
        it("rejects a start time in the past", () => {
            const request = makeValidRequest();

            request.schedule.startTime = utcIn(-1);
            request.schedule.endTime = utcIn(1);

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["schedule", "startTime"],
                "Start time cannot be in the past.",
            );
        });

        it("rejects an end time in the past", () => {
            const request = makeValidRequest();
            const startTime = utcIn(-2);

            request.schedule.startTime = startTime;
            request.schedule.endTime = Temporal.Instant
                .from(startTime)
                .add({ minutes: 30 })
                .toString();

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["schedule", "endTime"],
                "End time cannot be in the past.",
            );
        });
    });

    describe("canonical UTC timestamp format", () => {
        const nonCanonicalTimestamps = [
            {
                label: "a negative numeric offset",
                value: "2030-01-01T19:00:00-05:00",
            },
            {
                label: "a positive zero offset",
                value: "2030-01-02T00:00:00+00:00",
            },
            {
                label: "a timestamp without a time-zone designator",
                value: "2030-01-02T00:00:00",
            },
        ];

        it.each(nonCanonicalTimestamps)(
            "rejects $label for schedule.startTime",
            ({ value }) => {
                const request = makeValidRequest();

                request.schedule.startTime = value;
                request.schedule.endTime = "2030-01-02T02:00:00Z";

                const issues = getIssues(request);

                expectIssueAt(issues, ["schedule", "startTime"]);
            },
        );

        it.each(nonCanonicalTimestamps)(
            "rejects $label for schedule.endTime",
            ({ value }) => {
                const request = makeValidRequest();

                request.schedule.startTime = "2030-01-01T18:00:00Z";
                request.schedule.endTime = value;

                const issues = getIssues(request);

                expectIssueAt(issues, ["schedule", "endTime"]);
            },
        );

        it.each(nonCanonicalTimestamps)(
            "rejects $label for prices[0].effectiveAt",
            ({ value }) => {
                const request = makeValidRequest();

                request.prices[0].effectiveAt = value;

                const issues = getIssues(request);

                expectIssueAt(issues, ["prices", 0, "effectiveAt"]);
            },
        );
    });

    describe("price effective times", () => {
        it("accepts a future effective time", () => {
            const request = makeValidRequest();
            request.prices[0].effectiveAt = utcIn(48);

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });

        it("rejects an effective time in the past", () => {
            const request = makeValidRequest();
            request.prices[0].effectiveAt = utcIn(-1);

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["prices", 0, "effectiveAt"],
                "Price effective time cannot be in the past.",
            );
        });

        it("checks every price entry for past effective times", () => {
            const request = makeValidRequest();

            request.prices = [
                makePrice(utcIn(-3)),
                makePrice(utcIn(-2)),
                makePrice(utcIn(-1)),
            ];

            const issues = getIssues(request);

            expectIssueAt(issues, ["prices", 0, "effectiveAt"]);
            expectIssueAt(issues, ["prices", 1, "effectiveAt"]);
            expectIssueAt(issues, ["prices", 2, "effectiveAt"]);
        });

        it("accepts distinct effective instants", () => {
            const request = makeValidRequest();

            request.prices = [
                makePrice(utcIn(2)),
                makePrice(utcIn(3)),
            ];

            expect(createCourseRequestSchema.safeParse(request).success)
                .toBe(true);
        });

        it("rejects duplicate effective instants", () => {
            const request = makeValidRequest();

            request.prices = [
                makePrice("2030-01-01T12:00:00Z"),
                makePrice("2030-01-01T12:00:00.000Z"),
            ];

            const issues = getIssues(request);

            expectIssueAt(
                issues,
                ["prices", 1, "effectiveAt"],
                "Price effective times must be unique.",
            );
        });
    });

    describe("malformed input", () => {
        const malformedInputs: Array<{
            label: string;
            makeInput: () => unknown;
        }> = [
            {
                label: "a null schedule",
                makeInput: () => ({
                    ...makeValidRequest(),
                    schedule: null,
                }),
            },
            {
                label: "a numeric start time",
                makeInput: () => {
                    const request = makeValidRequest();

                    return {
                        ...request,
                        schedule: {
                            ...request.schedule,
                            startTime: 123,
                        },
                    };
                },
            },
            {
                label: "a malformed start-time string",
                makeInput: () => {
                    const request = makeValidRequest();

                    return {
                        ...request,
                        schedule: {
                            ...request.schedule,
                            startTime: "not-a-date",
                        },
                    };
                },
            },
            {
                label: "a null prices property",
                makeInput: () => ({
                    ...makeValidRequest(),
                    prices: null,
                }),
            },
            {
                label: "a null price entry",
                makeInput: () => ({
                    ...makeValidRequest(),
                    prices: [null],
                }),
            },
            {
                label: "a price with no effectiveAt",
                makeInput: () => ({
                    ...makeValidRequest(),
                    prices: [
                        {
                            amount: 5000,
                            currency: "USD",
                        },
                    ],
                }),
            },
        ];

        it.each(malformedInputs)(
            "returns a validation failure rather than throwing for $label",
            ({ makeInput }) => {
                const input = makeInput();
                let result:
                    | ReturnType<typeof createCourseRequestSchema.safeParse>
                    | undefined;

                expect(() => {
                    result = createCourseRequestSchema.safeParse(input);
                }).not.toThrow();

                if (!result) {
                    throw new Error("Validation did not return a result.");
                }

                expect(result.success).toBe(false);
            },
        );
    });
});