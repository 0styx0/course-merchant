import { Test, type TestingModule } from "@nestjs/testing";
import { Temporal } from "@js-temporal/polyfill";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { instant } from "../../../test/test-helpers.js";
import { CoursesRepository } from "../../courses.repository/courses.repository.js";
import { CoursesService } from "../../courses.service.js";
import { PrismaModule } from "../../../prisma/prisma.module.js";
import { createCourse, createCoursePrice, createCustomer, createPayment, createEnrollment, archiveCourse } from "../../../test/course-fixtures.js";

const NOW = instant("2026-09-29T14:00:00.000Z");

type CoursePrice = Partial<Parameters<typeof createCoursePrice>[0]>

const createPricedCourse = async (
    courseOverrides: Partial<Parameters<typeof createCourse>[0]> = {},
    priceOverrides: CoursePrice = {},
) => {
    const course = await createCourse({
        title: "React Fundamentals",
        description: "Learn React",
        startsAt: instant("2026-10-01T18:00:00.000Z"),
        endsAt: instant("2026-10-01T20:00:00.000Z"),
        timeZone: "America/New_York",
        ...courseOverrides,
    });

    const price = await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00.000Z"),
        ...priceOverrides,
    });

    return {
        course,
        price
    }
};

describe("CoursesService integration", () => {
    let service: CoursesService;
    let testingModule: TestingModule;

    beforeAll(async () => {
        testingModule = await Test.createTestingModule({
            imports: [PrismaModule],
            providers: [CoursesService, CoursesRepository],
        }).compile();

        service = testingModule.get(CoursesService);
    });

    beforeEach(() => {
        vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);
    });

    afterAll(async () => {
        await testingModule.close();
    });

    describe("findById", () => {
        it("returns an upcoming course", async () => {
            const { course } = await createPricedCourse();

            const result = await service.findById(course.id);

            expect(result).toEqual({
                id: course.id,
                name: "React Fundamentals",
                description: "Learn React",
                enrollmentCount: 0,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime: "2026-10-01T14:00:00-04:00",
                    endTime: "2026-10-01T16:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("returns an in-progress course", async () => {
            const { course } = await createPricedCourse({
                title: "In Progress",
                description: "Currently running",
                startsAt: instant("2026-09-29T13:00:00.000Z"),
                endsAt: instant("2026-09-29T15:00:00.000Z"),
            });

            const result = await service.findById(course.id);

            expect(result).toEqual({
                id: course.id,
                name: "In Progress",
                description: "Currently running",
                enrollmentCount: 0,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime: "2026-09-29T09:00:00-04:00",
                    endTime: "2026-09-29T11:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("returns an ended course", async () => {
            const { course } = await createPricedCourse({
                title: "Ended",
                description: "Already finished",
                startsAt: instant("2026-09-28T13:00:00.000Z"),
                endsAt: instant("2026-09-28T15:00:00.000Z"),
            });

            const result = await service.findById(course.id);

            expect(result).toEqual({
                id: course.id,
                name: "Ended",
                description: "Already finished",
                enrollmentCount: 0,
                price: {
                    amount: 9900,
                    currency: "USD",
                },
                schedule: {
                    startTime: "2026-09-28T09:00:00-04:00",
                    endTime: "2026-09-28T11:00:00-04:00",
                    timeZone: "America/New_York",
                },
            });
        });

        it("returns a course whose end time is exactly now", async () => {
            const { course } = await createPricedCourse({
                title: "Ending Now",
                description: "Ends now",
                startsAt: instant("2026-09-29T13:00:00.000Z"),
                endsAt: NOW,
            });

            const result = await service.findById(course.id);

            expect(result.id).toBe(course.id);
        });

        it("returns the most recent currently effective price", async () => {
            const { course } = await createPricedCourse({},
                {
                    effectiveAt: instant("2026-07-01T00:00:00.000Z"),
                });

            await createCoursePrice({
                courseId: course.id,
                amount: 4900,
                currency: "USD",
                effectiveAt: instant("2026-08-01T00:00:00.000Z"),
            });

            await createCoursePrice({
                courseId: course.id,
                amount: 7900,
                currency: "USD",
                effectiveAt: instant("2026-09-01T00:00:00.000Z"),
            });

            await createCoursePrice({
                courseId: course.id,
                amount: 9900,
                currency: "USD",
                effectiveAt: instant("2026-10-01T00:00:00.000Z"),
            });

            const result = await service.findById(course.id);

            expect(result.price).toEqual({
                amount: 7900,
                currency: "USD",
            });
        });

        it("uses a price that becomes effective exactly at now", async () => {
            const { course } = await createPricedCourse({
                title: "Boundary Price Course",
            });

            await createCoursePrice({
                courseId: course.id,
                amount: 12900,
                currency: "USD",
                effectiveAt: NOW,
            });

            const result = await service.findById(course.id);

            expect(result.price).toEqual({
                amount: 12900,
                currency: "USD",
            });
        });

        it("ignores a future price when a current price exists", async () => {
            const { course } = await createPricedCourse();

            await createCoursePrice({
                courseId: course.id,
                amount: 12900,
                currency: "USD",
                effectiveAt: instant("2026-10-01T00:00:00.000Z"),
            });

            const result = await service.findById(course.id);

            expect(result.price).toEqual({
                amount: 9900,
                currency: "USD",
            });
        });

        it("returns 404 when all prices are future", async () => {
            const course = await createCourse({
                title: "Future Price Course",
                description: "Not yet priced",
                startsAt: instant("2026-10-01T18:00:00.000Z"),
                endsAt: instant("2026-10-01T20:00:00.000Z"),
                timeZone: "America/New_York",
            });

            await createCoursePrice({
                courseId: course.id,
                amount: 9900,
                currency: "USD",
                effectiveAt: instant("2026-10-01T00:00:00.000Z"),
            });

            await expect(
                service.findById(course.id),
            ).rejects.toMatchObject({
                status: 404,
                response: {
                    message: "Course not found",
                    code: "COURSE_NOT_FOUND",
                },
            });
        });

        it("returns the correct enrollment count", async () => {
            const { course, price } = await createPricedCourse({
                title: "Popular Course",
            });

            for (let i = 0; i < 3; i++) {
                const customer = await createCustomer({});

                const payment = await createPayment({
                    customerId: customer.id,
                    coursePriceId: price.id,
                    amount: price.amount,
                    currency: price.currency,
                });

                await createEnrollment({
                    courseId: course.id,
                    customerId: customer.id,
                    paymentId: payment.id,
                });
            }

            const result = await service.findById(course.id);

            expect(result.enrollmentCount).toBe(3);
        });

        it("does not count enrollments belonging to another course", async () => {
            const { course: courseA } = await createPricedCourse({
                title: "Course A",
            });

            const { course: courseB, price: priceB } = await createPricedCourse({
                title: "Course B",
                startsAt: instant("2026-10-02T18:00:00.000Z"),
                endsAt: instant("2026-10-02T20:00:00.000Z"),
            });

            const customer = await createCustomer({});

            const payment = await createPayment({
                customerId: customer.id,
                coursePriceId: priceB.id,
                amount: priceB.amount,
                currency: priceB.currency,
            });

            await createEnrollment({
                courseId: courseB.id,
                customerId: customer.id,
                paymentId: payment.id,
            });

            const result = await service.findById(courseA.id);

            expect(result.enrollmentCount).toBe(0);
        });


        it("returns the schedule with the course timezone", async () => {
            const { course } = await createPricedCourse({
                title: "Timezone Course",
                startsAt: instant("2027-01-15T18:00:00.000Z"),
                endsAt: instant("2027-01-15T20:00:00.000Z"),
            });

            const result = await service.findById(course.id);

            expect(result.schedule).toEqual({
                startTime: "2027-01-15T13:00:00-05:00",
                endTime: "2027-01-15T15:00:00-05:00",
                timeZone: "America/New_York",
            });
        });
    });

    it("returns 404 for an archived course", async () => {
        const { course } = await createPricedCourse();
      
        await archiveCourse(course.id, NOW);
      
        await expect(
          service.findById(course.id),
        ).rejects.toMatchObject({
          status: 404,
          response: {
            message: "Course not found",
            code: "COURSE_NOT_FOUND",
          },
        });
      });
});