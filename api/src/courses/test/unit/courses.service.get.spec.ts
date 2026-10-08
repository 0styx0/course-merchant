import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { instant } from "../../../test/test-helpers.js";
import { CourseRepositoryModel, CoursesRepository } from "../../courses.repository/courses.repository.js";
import { CoursesService } from "../../courses.service.js";

const NOW = instant("2026-09-29T14:00:00.000Z");
const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
    id: COURSE_ID,
    title: "React Fundamentals",
    description: "Learn the fundamentals of React",
    startsAt: instant("2026-10-01T18:00:00.000Z"),
    endsAt: instant("2026-10-01T20:00:00.000Z"),
    timeZone: "America/New_York",
    prices: [
        {
            amount: 9900,
            currency: "USD",
        },
    ],
    enrollments: 12,
} satisfies CourseRepositoryModel;

describe("CoursesService", () => {
    let service: CoursesService;
    let coursesRepository: {
        findById: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        coursesRepository = {
            findById: vi.fn(),
        };

        service = new CoursesService(
            coursesRepository as unknown as CoursesRepository,
        );
    });

    describe("findById", () => {

        it("returns an upcoming course", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            const result = await service.findById(COURSE_ID);

            expect(result).toEqual({
                id: COURSE_ID,
                name: "React Fundamentals",
                description: "Learn the fundamentals of React",
                enrollmentCount: 12,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime:
                        "2026-10-01T14:00:00-04:00",
                    endTime:
                        "2026-10-01T16:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("returns an in-progress course", async () => {
            coursesRepository.findById.mockResolvedValue({
                ...repositoryCourse,
                startsAt: instant("2026-09-29T13:00:00.000Z"),
                endsAt: instant("2026-09-29T15:00:00.000Z"),
            });

            const result = await service.findById(COURSE_ID);

            expect(result).toEqual({
                id: COURSE_ID,
                name: "React Fundamentals",
                description: "Learn the fundamentals of React",
                enrollmentCount: 12,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime:
                        "2026-09-29T09:00:00-04:00",
                    endTime:
                        "2026-09-29T11:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("returns an ended course", async () => {
            coursesRepository.findById.mockResolvedValue({
                ...repositoryCourse,
                startsAt: instant("2026-09-28T13:00:00.000Z"),
                endsAt: instant("2026-09-28T15:00:00.000Z"),
            });

            const result = await service.findById(COURSE_ID);

            expect(result).toEqual({
                id: COURSE_ID,
                name: "React Fundamentals",
                description: "Learn the fundamentals of React",
                enrollmentCount: 12,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime:
                        "2026-09-28T09:00:00-04:00",
                    endTime:
                        "2026-09-28T11:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("passes the course ID to the repository unchanged", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            await service.findById(COURSE_ID);

            expect(coursesRepository.findById).toHaveBeenCalledWith(
                COURSE_ID,
                expect.any(Temporal.Instant),
            );
        });

        it("passes the current instant to the repository", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            await service.findById(COURSE_ID);

            const [, now] =
                coursesRepository.findById.mock.calls[0];

            expect(now).toBeInstanceOf(Temporal.Instant);
        });

        it("returns the course ID", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            const result = await service.findById(COURSE_ID);

            expect(result.id).toBe(COURSE_ID);
        });

        it("returns the course name and description", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            const result = await service.findById(COURSE_ID);

            expect(result.name).toBe("React Fundamentals");
            expect(result.description).toBe(
                "Learn the fundamentals of React",
            );
        });

        it("returns the enrollment count", async () => {
            coursesRepository.findById.mockResolvedValue({
                ...repositoryCourse,
                enrollments: 27,
            });

            const result = await service.findById(COURSE_ID);

            expect(result.enrollmentCount).toBe(27);
        });

        it("returns the current effective price selected by the repository", async () => {
            coursesRepository.findById.mockResolvedValue({
                ...repositoryCourse,
                prices: [
                    {
                        amount: 12900,
                        currency: "USD",
                        effectiveAt: NOW,
                    },
                ],
            });

            const result = await service.findById(COURSE_ID);

            expect(result.price).toEqual({
                amount: 12900,
                currency: "USD",
            });
        });

        it("returns the schedule with the course timezone", async () => {
            coursesRepository.findById.mockResolvedValue(repositoryCourse);

            const result = await service.findById(COURSE_ID);

            expect(result.schedule).toEqual({
                startTime:
                    "2026-10-01T14:00:00-04:00",
                endTime:
                    "2026-10-01T16:00:00-04:00",
                timeZone: "America/New_York",
            });
        });

        it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
            coursesRepository.findById.mockResolvedValue(null);

            await expect(
                service.findById(COURSE_ID),
            ).rejects.toMatchObject({
                status: 404,
                response: {
                    title: "Course not found",
                    code: "COURSE_NOT_FOUND",
                },
            });
        });
    });
});
