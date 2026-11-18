import { Inject, Injectable } from "@nestjs/common";

import {
  formatOptionalDate,
  toEnrollmentTimesResponse,
} from "@/enrollments/enrollment-times-response.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import type { ListAdminCustomersResponse } from "types.js";
import {
  AdminCustomersRepository,
  type AdminCustomerRepositoryModel,
} from "./admin-customers.repository.js";

type AdminCustomerResponse = ListAdminCustomersResponse["customers"][number];
type AdminCustomerEnrollmentResponse =
  AdminCustomerResponse["enrollments"][number];

/**
 * Lists every customer for the admin, with times in UTC and each course's
 * stored title as its name.
 */
@Injectable()
export class AdminCustomersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminCustomersRepository)
    private readonly adminCustomersRepository: AdminCustomersRepository,
  ) {}

  async listCustomers(): Promise<ListAdminCustomersResponse> {
    const customers =
      await this.adminCustomersRepository.findAllCustomersWithEnrollments(
        this.prisma.db,
      );

    return { customers: customers.map(toAdminCustomerResponse) };
  }
}

function toAdminCustomerResponse(
  customer: AdminCustomerRepositoryModel,
): AdminCustomerResponse {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    latestCheckoutStartedAt: formatOptionalDate(
      customer.latestCheckoutStartedAt,
    ),
    enrollments: customer.enrollments.map(toAdminCustomerEnrollmentResponse),
  };
}

function toAdminCustomerEnrollmentResponse(
  enrollment: AdminCustomerRepositoryModel["enrollments"][number],
): AdminCustomerEnrollmentResponse {
  return {
    course: { id: enrollment.course.id, name: enrollment.course.title },
    ...toEnrollmentTimesResponse(enrollment),
  };
}
