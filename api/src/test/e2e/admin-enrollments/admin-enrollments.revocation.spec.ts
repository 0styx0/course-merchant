import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/prisma/db.js";
import { bearer, logInAsAdmin } from "@/test/admin-fixtures.js";
import {
  createCustomer,
  createEnrollment,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { createE2eApp, httpServer } from "../e2e-helpers.js";

const UNKNOWN_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /v1/admin/courses/:courseId/enrollments/:customerId/revocation (e2e)", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  beforeEach(async () => {
    token = await logInAsAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const revoke = (courseId: string, customerId: string) =>
    request(httpServer(app))
      .post(
        `/v1/admin/courses/${courseId}/enrollments/${customerId}/revocation`,
      )
      .set("Authorization", bearer(token));

  const findEnrollment = (id: string) =>
    db.orm.public.Enrollment.where((enrollment) =>
      enrollment.id.eq(id),
    ).first();

  const findPayment = (id: string) =>
    db.orm.public.Payment.where((payment) => payment.id.eq(id)).first();

  async function enrollPayingStudent() {
    const { course, price } = await createPricedCourse();
    const customer = await createCustomer({});
    const payment = await createPayment({
      customerId: customer.id,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    });
    const enrollment = await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
      paymentId: payment.id,
    });

    return { course, customer, payment, enrollment };
  }

  it("revokes a paid enrollment and records its payment as refunded", async () => {
    const { course, customer, payment, enrollment } =
      await enrollPayingStudent();

    await revoke(course.id, customer.id).expect(204);

    const revokedAt = (await findEnrollment(enrollment.id))?.revokedAt;
    const refundedPayment = await findPayment(payment.id);

    expect(revokedAt).not.toBeNull();
    expect(refundedPayment?.status).toBe("refunded");
    expect(refundedPayment?.refundedAt).toEqual(revokedAt);
  });

  it("revokes a free enrollment, which has no payment", async () => {
    const { course } = await createPricedCourse();
    const customer = await createCustomer({});
    const enrollment = await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
    });

    await revoke(course.id, customer.id).expect(204);

    expect((await findEnrollment(enrollment.id))?.revokedAt).not.toBeNull();
  });

  it("answers a repeat call with 204 and keeps the stored rows", async () => {
    const { course, customer, payment, enrollment } =
      await enrollPayingStudent();
    await revoke(course.id, customer.id).expect(204);
    const enrollmentAfterFirst = await findEnrollment(enrollment.id);
    const paymentAfterFirst = await findPayment(payment.id);

    await revoke(course.id, customer.id).expect(204);

    expect(await findEnrollment(enrollment.id)).toEqual(enrollmentAfterFirst);
    expect(await findPayment(payment.id)).toEqual(paymentAfterFirst);
  });

  describe("when no enrollment exists", () => {
    const expectEnrollmentNotFound = async (
      courseId: string,
      customerId: string,
    ) => {
      const response = await revoke(courseId, customerId).expect(404);

      expect(response.body).toEqual({
        title: "Enrollment not found",
        detail: `No enrollment exists for customer ${customerId} in course ${courseId}.`,
        code: "ENROLLMENT_NOT_FOUND",
      });
    };

    it("answers 404 for an unknown course", async () => {
      const { customer } = await enrollPayingStudent();

      await expectEnrollmentNotFound(UNKNOWN_ID, customer.id);
    });

    it("answers 404 for an unknown customer", async () => {
      const { course } = await enrollPayingStudent();

      await expectEnrollmentNotFound(course.id, UNKNOWN_ID);
    });

    it("answers 404 for a customer enrolled in a different course", async () => {
      const { customer } = await enrollPayingStudent();
      const { course: otherCourse } = await createPricedCourse();

      await expectEnrollmentNotFound(otherCourse.id, customer.id);
    });
  });

  it("answers 400 INVALID_COURSE_ID for a malformed course id", async () => {
    const response = await revoke("not-a-uuid", UNKNOWN_ID).expect(400);

    expect(response.body).toMatchObject({
      title: "Invalid course ID",
      code: "INVALID_COURSE_ID",
      detail: "'not-a-uuid' is not a valid course identifier.",
    });
  });

  it("answers 400 INVALID_CUSTOMER_ID for a malformed customer id", async () => {
    const response = await revoke(UNKNOWN_ID, "not-a-uuid").expect(400);

    expect(response.body).toMatchObject({
      title: "Invalid customer ID",
      code: "INVALID_CUSTOMER_ID",
      detail: "'not-a-uuid' is not a valid customer identifier.",
    });
  });
});
