import { describe, expect, it, vi } from "vitest";

import {
  AdminCustomersRepository,
  type AdminCustomerRepositoryModel,
} from "@/admin-customers/admin-customers.repository.js";
import { AdminCustomersService } from "@/admin-customers/admin-customers.service.js";
import {
  asDependency,
  fakePrisma,
  instant,
  type MockMethods,
} from "@/test/test-helpers.js";

function makeService(customers: AdminCustomerRepositoryModel[]) {
  const { prisma, db } = fakePrisma();
  const repository: MockMethods<
    AdminCustomersRepository,
    "findAllCustomersWithEnrollments"
  > = {
    findAllCustomersWithEnrollments: vi
      .fn<AdminCustomersRepository["findAllCustomersWithEnrollments"]>()
      .mockResolvedValue(customers),
  };

  return {
    db,
    repository,
    service: new AdminCustomersService(prisma, asDependency(repository)),
  };
}

const ada: AdminCustomerRepositoryModel = {
  id: "8b0e1f5c-0000-4000-8000-000000000001",
  name: "Ada Lovelace",
  email: "ada@example.com",
  latestCheckoutStartedAt: instant("2026-09-29T15:00:00Z"),
  enrollments: [
    {
      purchasedAt: instant("2026-09-29T15:05:00Z"),
      revokedAt: instant("2026-10-01T09:00:00Z"),
      suspendedAt: instant("2026-10-02T09:00:00Z"),
      course: {
        id: "8b0e1f5c-0000-4000-8000-0000000000c1",
        title: "React Fundamentals",
      },
    },
  ],
};

describe("AdminCustomersService.listCustomers", () => {
  it("reads the customers from the repository with the database scope", async () => {
    const { service, repository, db } = makeService([ada]);

    await service.listCustomers();

    expect(repository.findAllCustomersWithEnrollments).toHaveBeenCalledWith(db);
  });

  it("sends each course title as the course name and every time in UTC", async () => {
    const { service } = makeService([ada]);

    await expect(service.listCustomers()).resolves.toEqual({
      customers: [
        {
          id: ada.id,
          name: "Ada Lovelace",
          email: "ada@example.com",
          latestCheckoutStartedAt: "2026-09-29T15:00:00Z",
          enrollments: [
            {
              course: {
                id: "8b0e1f5c-0000-4000-8000-0000000000c1",
                name: "React Fundamentals",
              },
              enrolledAt: "2026-09-29T15:05:00Z",
              revokedAt: "2026-10-01T09:00:00Z",
              suspendedAt: "2026-10-02T09:00:00Z",
            },
          ],
        },
      ],
    });
  });

  it("keeps missing times null", async () => {
    const { service } = makeService([
      {
        ...ada,
        latestCheckoutStartedAt: null,
        enrollments: [
          { ...ada.enrollments[0], revokedAt: null, suspendedAt: null },
        ],
      },
    ]);

    const { customers } = await service.listCustomers();

    expect(customers[0]).toMatchObject({
      latestCheckoutStartedAt: null,
      enrollments: [{ revokedAt: null, suspendedAt: null }],
    });
  });

  it("answers an empty list when there are no customers", async () => {
    const { service } = makeService([]);

    await expect(service.listCustomers()).resolves.toEqual({
      customers: [],
    });
  });
});
