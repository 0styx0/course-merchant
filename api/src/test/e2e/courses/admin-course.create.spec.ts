import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { AdminCoursesController } from "@/courses/admin-courses.controller.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";

describe("Course creation e2e", () => {
    let app: INestApplication;

    const service = {
        createCourse: vi.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AdminCoursesController],
            providers: [
                {
                    provide: AdminCoursesService,
                    useValue: service,
                },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix("v1");
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    function makeValidRequest() {
        const now = Temporal.Now.instant();
        const startsAt = now.add({ hours: 3 });

        return {
            name: "Integration course",
            description: "A course used to test the HTTP endpoint.",
            status: "drafted",
            schedule: {
                startTime: startsAt.toString(),
                endTime: startsAt.add({ hours: 1 }).toString(),
                timeZone: "UTC",
            },
            prices: [
                {
                    amount: 2500,
                    currency: "USD",
                    effectiveAt: now.add({ hours: 1 }).toString(),
                },
            ],
        };
    }

    it("creates a course and returns 201", async () => {
        service.createCourse.mockResolvedValue({
            id: "course-123",
            title: "Integration course",
        });

        const body = makeValidRequest();

        const response = await request(app.getHttpServer())
            .post("/v1/admin/courses")
            .send(body)
            .expect(201);

        // integration tests cover specific matching
        expect(response.body).toMatchObject({
            id: "course-123",
            title: "Integration course",
        });

        expect(service.createCourse).toHaveBeenCalledOnce();
        expect(service.createCourse).toHaveBeenCalledWith(body);
    });

    it("returns 400 for invalid input without calling the service", async () => {
        const body = {
            ...makeValidRequest(),
            name: " ",
            prices: [],
        };

        const response = await request(app.getHttpServer())
            .post("/v1/admin/courses")
            .send(body)
            .expect(400);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ["name"],
                }),
                expect.objectContaining({
                    path: ["prices"],
                }),
            ]),
        );

        expect(service.createCourse).not.toHaveBeenCalled();
    });
});