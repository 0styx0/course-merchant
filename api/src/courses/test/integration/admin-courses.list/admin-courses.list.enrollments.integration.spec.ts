import { Temporal } from "@js-temporal/polyfill";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { PrismaModule } from "@/prisma/prisma.module.js";
import {
  createCoursePrice,
  createCustomer,
  createEnrollment,
  createEnrollmentEmail,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";

const NOW = instant("2026-09-29T14:00:00Z");

describe("AdminCoursesService integration", () => {
  let service: AdminCoursesService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AdminCoursesService, AdminCoursesRepository],
    }).compile();

    service = testingModule.get(AdminCoursesService);
  });

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe("findAllAdmin", () => {
    it("returns all enrollments with their corresponding customer and payment details", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {},
        {
          amount: 7900,
          currency: "USD",
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      const augustPrice = await createCoursePrice({
        courseId: course.id,
        amount: 12900,
        currency: "USD",
        effectiveAt: instant("2026-08-01T00:00:00Z"),
      });

      const ada = await createCustomer({
        name: "Ada Lovelace",
      });

      const adaPaidAt = instant("2026-09-29T13:00:00Z");

      const adaPayment = await createPayment({
        customerId: ada.id,
        coursePriceId: julyPrice.id,
        amount: julyPrice.amount,
        currency: julyPrice.currency,
        paidAt: adaPaidAt,
      });

      const adaEnrollment = await createEnrollment({
        courseId: course.id,
        customerId: ada.id,
        paymentId: adaPayment.id,
      });

      const grace = await createCustomer({
        name: "Grace Hopper",
      });

      const gracePaidAt = instant("2026-09-29T12:00:00Z");

      const gracePayment = await createPayment({
        customerId: grace.id,
        coursePriceId: augustPrice.id,
        amount: augustPrice.amount,
        currency: augustPrice.currency,
        paidAt: gracePaidAt,
      });

      const graceEnrollment = await createEnrollment({
        courseId: course.id,
        customerId: grace.id,
        paymentId: gracePayment.id,
      });

      await createEnrollmentEmail({
        enrollment: adaEnrollment,
        recipient: ada.email,
        status: "sent",
      });
      await createEnrollmentEmail({
        enrollment: graceEnrollment,
        recipient: grace.email,
        status: "pending",
      });

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.enrollments).toHaveLength(2);

      expect(listedCourse!.enrollments).toEqual(
        expect.arrayContaining([
          {
            revokedAt: null,
            suspendedAt: null,
            emailStatus: "sent",
            customer: {
              id: ada.id,
              name: "Ada Lovelace",
              email: ada.email,
            },
            payment: {
              status: "succeeded",
              amount: julyPrice.amount,
              paidAt: "2026-09-29T13:00:00Z",
            },
          },
          {
            revokedAt: null,
            suspendedAt: null,
            emailStatus: "pending",
            customer: {
              id: grace.id,
              name: "Grace Hopper",
              email: grace.email,
            },
            payment: {
              status: "succeeded",
              amount: augustPrice.amount,
              paidAt: "2026-09-29T12:00:00Z",
            },
          },
        ]),
      );
    });

    it("returns an empty enrollment list for a course without enrollments", async () => {
      const { course } = await createPricedCourse();

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.enrollments).toEqual([]);
    });
  });
});
