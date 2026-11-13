import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it, vi } from "vitest";

import { AdminEnrollmentsService } from "@/admin-enrollments/admin-enrollments.service.js";
import {
  EnrollmentsRepository,
  type EnrollmentRecord,
} from "@/enrollments/enrollments.repository.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const courseId = "8b0e1f5c-0000-4000-8000-000000000001";
const customerId = "8b0e1f5c-0000-4000-8000-000000000002";
const paymentId = "8b0e1f5c-0000-4000-8000-000000000003";
const now = Temporal.Instant.from("2026-11-01T12:00:00Z");

const activeEnrollment: EnrollmentRecord = {
  id: "8b0e1f5c-0000-4000-8000-000000000004",
  paymentId,
  revokedAt: null,
  suspendedAt: null,
};

function makeService(
  found: EnrollmentRecord | null = activeEnrollment,
  hooks: Parameters<typeof fakePrisma>[0] = {},
) {
  const fake = fakePrisma(hooks);
  const enrollmentsRepository: MockMethods<
    EnrollmentsRepository,
    "findEnrollment" | "revokeEnrollment"
  > = {
    findEnrollment: vi
      .fn<EnrollmentsRepository["findEnrollment"]>()
      .mockResolvedValue(found),
    revokeEnrollment: vi
      .fn<EnrollmentsRepository["revokeEnrollment"]>()
      .mockResolvedValue(true),
  };
  const paymentsRepository: MockMethods<
    PaymentsRepository,
    "markPaymentRefunded"
  > = {
    markPaymentRefunded: vi
      .fn<PaymentsRepository["markPaymentRefunded"]>()
      .mockResolvedValue(true),
  };
  const clock: MockMethods<DatabaseClock, "now"> = {
    now: vi.fn<DatabaseClock["now"]>().mockResolvedValue(now),
  };

  return {
    fake,
    enrollmentsRepository,
    paymentsRepository,
    service: new AdminEnrollmentsService(
      fake.prisma,
      asDependency<EnrollmentsRepository>(enrollmentsRepository),
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<DatabaseClock>(clock),
    ),
  };
}

describe("AdminEnrollmentsService.unenroll", () => {
  it("revokes a paid enrollment and refunds its payment at the same database time", async () => {
    const { service, fake, enrollmentsRepository, paymentsRepository } =
      makeService();

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");
    expect(enrollmentsRepository.revokeEnrollment).toHaveBeenCalledWith(
      fake.tx,
      { courseId, customerId, paymentId, now },
    );
    expect(paymentsRepository.markPaymentRefunded).toHaveBeenCalledWith(
      fake.tx,
      paymentId,
      now,
    );
  });

  it("revokes a free enrollment without touching any payment", async () => {
    const { service, fake, enrollmentsRepository, paymentsRepository } =
      makeService({ ...activeEnrollment, paymentId: null });

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");
    expect(enrollmentsRepository.revokeEnrollment).toHaveBeenCalledWith(
      fake.tx,
      { courseId, customerId, paymentId: null, now },
    );
    expect(paymentsRepository.markPaymentRefunded).not.toHaveBeenCalled();
  });

  it("reports an already revoked enrollment and writes nothing", async () => {
    const { service, enrollmentsRepository, paymentsRepository } = makeService({
      ...activeEnrollment,
      revokedAt: now,
    });

    expect(await service.unenroll(courseId, customerId)).toBe(
      "already_unenrolled",
    );
    expect(enrollmentsRepository.revokeEnrollment).not.toHaveBeenCalled();
    expect(paymentsRepository.markPaymentRefunded).not.toHaveBeenCalled();
  });

  it("refunds nothing when a concurrent call revoked the enrollment first", async () => {
    const { service, enrollmentsRepository, paymentsRepository } =
      makeService();
    enrollmentsRepository.revokeEnrollment.mockResolvedValue(false);

    expect(await service.unenroll(courseId, customerId)).toBe(
      "already_unenrolled",
    );
    expect(paymentsRepository.markPaymentRefunded).not.toHaveBeenCalled();
  });

  it("reports a missing enrollment and writes nothing", async () => {
    const { service, enrollmentsRepository, paymentsRepository } =
      makeService(null);

    expect(await service.unenroll(courseId, customerId)).toBe("not_found");
    expect(enrollmentsRepository.revokeEnrollment).not.toHaveBeenCalled();
    expect(paymentsRepository.markPaymentRefunded).not.toHaveBeenCalled();
  });

  it("still reports success when the payment wasn't succeeded", async () => {
    const { service, paymentsRepository } = makeService();
    paymentsRepository.markPaymentRefunded.mockResolvedValue(false);

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");
  });

  it("rolls back the transaction and passes on the error when recording the refund fails", async () => {
    const onCommit = vi.fn();
    const { service, paymentsRepository } = makeService(activeEnrollment, {
      onCommit,
    });
    paymentsRepository.markPaymentRefunded.mockRejectedValue(
      new Error("db down"),
    );

    await expect(service.unenroll(courseId, customerId)).rejects.toThrow(
      "db down",
    );
    expect(onCommit).not.toHaveBeenCalled();
  });
});
