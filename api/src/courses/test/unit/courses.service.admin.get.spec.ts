import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { instant } from "../../../test/test-helpers.js";
import {
    CourseRepositoryModelAdmin,
    CoursesRepository,
} from "../../courses.repository/courses.repository.js";
import { CoursesService } from "../../courses.service.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
    id: COURSE_ID,
    title: "React Fundamentals",
    description: "Learn the fundamentals of React",
    startsAt: instant("2026-10-01T18:00:00.000Z"),
    endsAt: instant("2026-10-01T20:00:00.000Z"),
    timeZone: "America/New_York",

    statuses: [
        {
            name: "published",
            changedAt: instant("2026-09-29T14:00:00.000Z"),
        },
        {
            name: "archived",
            changedAt: instant("2026-09-28T14:00:00.000Z"),
        },
    ],

    prices: [
        {
            id: "price_early",
            amount: 7900,
            currency: "USD",
            effectiveAt: instant("2026-10-20T04:00:00.000Z"),
        },
        {
            id: "price_later",
            amount: 9900,
            currency: "USD",
            effectiveAt: instant("2026-11-15T05:00:00.000Z"),
        },
    ],

    enrollments: [
        {
            customer: {
                id: "customer_1",
                name: "Ada Lovelace",
                email: "ada@example.com",
            },
            payment: {
                status: "succeeded",
                amount: 7900,
                paidAt: instant("2026-09-29T15:00:00.000Z"),
            },
        },
        {
            customer: {
                id: "customer_2",
                name: "Grace Hopper",
                email: "grace@example.com",
            },
            payment: {
                status: "pending",
                amount: 9900,
                paidAt: instant("2022-09-27T10:00:00.000Z"),
            },
        },
    ],
} satisfies CourseRepositoryModelAdmin;

describe("CoursesService", () => {
    let service: CoursesService;

    let coursesRepository: {
        findCourseDetailsByIdAdmin: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        coursesRepository = {
            findCourseDetailsByIdAdmin: vi.fn(),
        };

        service = new CoursesService(
            coursesRepository as unknown as CoursesRepository,
        );
    });

    describe("findByIdAdmin", () => {
        it("returns the correctly mapped admin course", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result).toEqual({
                id: COURSE_ID,
                name: "React Fundamentals",
                description: "Learn the fundamentals of React",

                schedule: {
                    startTime: "2026-10-01T14:00:00-04:00",
                    endTime: "2026-10-01T16:00:00-04:00",
                    timeZone: "America/New_York",
                },

                status: {
                    name: "published",
                    changedAt: "2026-09-29T10:00:00-04:00",
                },

                prices: [
                    {
                        id: "price_early",
                        amount: 7900,
                        currency: "USD",
                        effectiveAt: "2026-10-20T00:00:00-04:00",
                    },
                    {
                        id: "price_later",
                        amount: 9900,
                        currency: "USD",
                        effectiveAt: "2026-11-15T00:00:00-05:00",
                    },
                ],

                enrollments: [
                    {
                        customer: {
                            id: "customer_1",
                            name: "Ada Lovelace",
                            email: "ada@example.com",
                        },
                        payment: {
                            status: "succeeded",
                            amount: 7900,
                            paidAt: "2026-09-29T11:00:00-04:00",
                        },
                    },
                    {
                        customer: {
                            id: "customer_2",
                            name: "Grace Hopper",
                            email: "grace@example.com",
                        },
                        payment: {
                            status: "pending",
                            amount: 9900,
                            paidAt: "2022-09-27T06:00:00-04:00",
                        },
                    },
                ],
            });
        });

        it("passes the course ID to the repository unchanged", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            await service.findByIdAdmin(COURSE_ID);

            expect(
                coursesRepository.findCourseDetailsByIdAdmin,
            ).toHaveBeenCalledWith(COURSE_ID);
        });

        it("returns the course ID, name, and description", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.id).toBe(COURSE_ID);
            expect(result.name).toBe("React Fundamentals");
            expect(result.description).toBe(
                "Learn the fundamentals of React",
            );
        });

        it("formats schedule timestamps using the course time zone", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.schedule).toEqual({
                startTime: "2026-10-01T14:00:00-04:00",
                endTime: "2026-10-01T16:00:00-04:00",
                timeZone: "America/New_York",
            });
        });

        it("returns the latest status and formats its timestamp", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.status).toEqual({
                name: "published",
                changedAt: "2026-09-29T10:00:00-04:00",
            });
        });

        it("maps every price while preserving repository order", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.prices).toEqual([
                {
                    id: "price_early",
                    amount: 7900,
                    currency: "USD",
                    effectiveAt: "2026-10-20T00:00:00-04:00",
                },
                {
                    id: "price_later",
                    amount: 9900,
                    currency: "USD",
                    effectiveAt: "2026-11-15T00:00:00-05:00",
                },
            ]);
        });

        it("maps customer and payment details to the correct enrollments", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
                repositoryCourse,
            );

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.enrollments).toEqual([
                {
                    customer: {
                        id: "customer_1",
                        name: "Ada Lovelace",
                        email: "ada@example.com",
                    },
                    payment: {
                        status: "succeeded",
                        amount: 7900,
                        paidAt: "2026-09-29T11:00:00-04:00",
                    },
                },
                {
                    customer: {
                        id: "customer_2",
                        name: "Grace Hopper",
                        email: "grace@example.com",
                    },
                    payment: {
                        status: "pending",
                        amount: 9900,
                        paidAt: "2022-09-27T06:00:00-04:00",
                    },
                },
            ]);
        });

        it("returns an empty enrollment list when the course has no enrollments", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue({
                ...repositoryCourse,
                enrollments: [],
            });

            const result = await service.findByIdAdmin(COURSE_ID);

            expect(result.enrollments).toEqual([]);
        });

        it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
            coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(null);

            await expect(
                service.findByIdAdmin(COURSE_ID),
            ).rejects.toMatchObject({
                status: 404,
                response: {
                    title: "Course not found",
                    code: "COURSE_NOT_FOUND",
                },
            });
        });

        it("propagates repository errors", async () => {
            const error = new Error("Database unavailable");

            coursesRepository.findCourseDetailsByIdAdmin.mockRejectedValue(
                error,
            );

            await expect(
                service.findByIdAdmin(COURSE_ID),
            ).rejects.toBe(error);
        });
    });
});