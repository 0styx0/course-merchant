import { describe, expect, it } from "vitest";

import { toPublicCourseResponse } from "@/courses/courses.mapper.js";
import { instant } from "../../../test/test-helpers.js";
import type {
    CourseRepositoryModelPublic,
} from "../../courses.repository/courses.repository.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
    id: COURSE_ID,
    title: "React Fundamentals",
    description: "Learn the fundamentals of React",
    startsAt: instant("2026-10-01T18:00:00Z"),
    endsAt: instant("2026-10-01T20:00:00Z"),
    timeZone: "America/New_York",
    prices: [
        {
            amount: 9900,
            currency: "USD",
        },
    ],
    enrollments: 12,
} satisfies CourseRepositoryModelPublic;

describe("toPublicCourseResponse", () => {
    it("maps a repository course to the public API response", () => {
        expect(toPublicCourseResponse(repositoryCourse)).toEqual({
            id: COURSE_ID,
            name: "React Fundamentals",
            description: "Learn the fundamentals of React",
            enrollmentCount: 12,
            price: {
                amount: 9900,
                currency: "USD",
            },
            schedule: {
                startTime: "2026-10-01T18:00:00Z",
                endTime: "2026-10-01T20:00:00Z",
                timeZone: "America/New_York",
            },
        });
    });
});