import { Temporal } from "@js-temporal/polyfill";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  afterAll,
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
import { PaymentsRepository } from "@/payments/payments.repository.js";

const NOW = instant("2026-09-29T14:00:00Z");

describe("AdminCoursesService integration", () => {
  let service: AdminCoursesService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AdminCoursesService,
        AdminCoursesRepository,
        PaymentsRepository,
      ],
    }).compile();

    service = testingModule.get(AdminCoursesService);
  });

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);
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
            refundStatus: "not_owed",
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
            refundStatus: "not_owed",
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

    it("marks owed enrollments per course, so a buyer owed for one course is not owed for another", async () => {
      const first = await createPricedCourse();
      const second = await createPricedCourse();
      const ada = await createCustomer({ name: "Ada Lovelace" });

      const paymentFor = (coursePrice: typeof first.price) =>
        createPayment({
          customerId: ada.id,
          coursePriceId: coursePrice.id,
          amount: coursePrice.amount,
          currency: coursePrice.currency,
        });

      for (const { course, price } of [first, second]) {
        const payment = await paymentFor(price);
        await createEnrollment({
          courseId: course.id,
          customerId: ada.id,
          paymentId: payment.id,
        });
      }
      await paymentFor(first.price);

      const result = await service.findAllAdmin();

      const refundStatusOf = (courseId: string) =>
        result.courses.find((item) => item.id === courseId)!.enrollments[0]
          .refundStatus;

      expect(refundStatusOf(first.course.id)).toBe("owed");
      expect(refundStatusOf(second.course.id)).toBe("not_owed");
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
