import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createCustomer,
  createEnrollment,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import type { ListAdminCustomersResponse } from "types.js";
import { bearer, logInAsAdmin } from "../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";

describe("Admin Customers API (e2e)", () => {
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

  function listCustomers(): Promise<TypedResponse<ListAdminCustomersResponse>> {
    return request(httpServer(app))
      .get("/v1/admin/customers")
      .set("Authorization", bearer(token))
      .expect("Content-Type", /^application\/json(?:;|$)/)
      .expect(200);
  }

  describe("GET /v1/admin/customers", () => {
    it("answers an empty list when there are no customers", async () => {
      const response = await listCustomers();

      expect(response.body).toEqual({ customers: [] });
    });

    it("lists the newest customer first, one with no enrollment and one with two", async () => {
      const { course: react, price } = await createPricedCourse({
        title: "React Fundamentals",
      });
      const { course: node } = await createPricedCourse({
        title: "Node Basics",
      });
      const olderCustomer = await createCustomer({
        name: "Ada Lovelace",
        createdAt: instant("2026-09-01T10:00:00Z"),
      });
      const newerCustomer = await createCustomer({
        name: "Tal Newcomer",
        createdAt: instant("2026-09-02T10:00:00Z"),
      });
      const payment = await createPayment({
        customerId: olderCustomer.id,
        coursePriceId: price.id,
        amount: price.amount,
        currency: price.currency,
        createdAt: instant("2026-09-09T10:00:00Z"),
      });
      await createEnrollment({
        courseId: react.id,
        customerId: olderCustomer.id,
        paymentId: payment.id,
        purchasedAt: instant("2026-09-10T10:00:00Z"),
        revokedAt: instant("2026-09-11T10:00:00Z"),
        suspendedAt: instant("2026-09-12T10:00:00Z"),
      });
      await createEnrollment({
        courseId: node.id,
        customerId: olderCustomer.id,
        purchasedAt: instant("2026-09-20T10:00:00Z"),
      });

      const response = await listCustomers();

      expect(response.body.customers).toEqual([
        {
          id: newerCustomer.id,
          name: "Tal Newcomer",
          email: newerCustomer.email,
          latestCheckoutStartedAt: null,
          enrollments: [],
        },
        {
          id: olderCustomer.id,
          name: "Ada Lovelace",
          email: olderCustomer.email,
          latestCheckoutStartedAt: "2026-09-09T10:00:00Z",
          enrollments: [
            {
              course: { id: node.id, name: "Node Basics" },
              enrolledAt: "2026-09-20T10:00:00Z",
              revokedAt: null,
              suspendedAt: null,
            },
            {
              course: { id: react.id, name: "React Fundamentals" },
              enrolledAt: "2026-09-10T10:00:00Z",
              revokedAt: "2026-09-11T10:00:00Z",
              suspendedAt: "2026-09-12T10:00:00Z",
            },
          ],
        },
      ]);
    });
  });
});
