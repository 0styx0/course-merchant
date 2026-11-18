import { describe, expect, it, vi } from "vitest";

import { AdminCustomersController } from "@/admin-customers/admin-customers.controller.js";
import { AdminCustomersService } from "@/admin-customers/admin-customers.service.js";
import { asDependency, type MockMethods } from "@/test/test-helpers.js";
import type { ListAdminCustomersResponse } from "types.js";

describe("AdminCustomersController", () => {
  it("answers with the customers the service lists", async () => {
    const answer: ListAdminCustomersResponse = {
      customers: [
        {
          id: "8b0e1f5c-0000-4000-8000-000000000001",
          name: "Ada Lovelace",
          email: "ada@example.com",
          latestCheckoutStartedAt: null,
          enrollments: [],
        },
      ],
    };
    const service: MockMethods<AdminCustomersService, "listCustomers"> = {
      listCustomers: vi
        .fn<AdminCustomersService["listCustomers"]>()
        .mockResolvedValue(answer),
    };
    const controller = new AdminCustomersController(asDependency(service));

    await expect(controller.listCustomers()).resolves.toBe(answer);
  });
});
