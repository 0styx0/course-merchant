import { Inject, Injectable } from "@nestjs/common";

import {
  EnrollmentsRepository,
  type EnrollmentRecord,
} from "@/enrollments/enrollments.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { DatabaseClock, type ClockScope } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import type { DbScope } from "types.js";

export type UnenrollOutcome = "unenrolled" | "already_unenrolled" | "not_found";

/**
 * Takes a student's access away on the admin's say-so. Stripe has no part:
 * the admin refunds the money in the Stripe dashboard, and this records it.
 */
@Injectable()
export class AdminEnrollmentsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EnrollmentsRepository)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(DatabaseClock)
    private readonly clock: DatabaseClock,
  ) {}

  /**
   * Revokes the enrollment and records its payment as refunded, both or
   * neither. A payment that isn't `succeeded` stays as it is, and the
   * revocation still saves.
   */
  async unenroll(
    courseId: string,
    customerId: string,
  ): Promise<UnenrollOutcome> {
    return this.prisma.db.transaction(async (tx) => {
      const enrollment = await this.enrollmentsRepository.findEnrollment(
        tx,
        courseId,
        customerId,
      );

      if (!enrollment) {
        return "not_found";
      }

      if (enrollment.revokedAt) {
        return "already_unenrolled";
      }

      return this.revokeInsideTransaction(tx, courseId, customerId, enrollment);
    });
  }

  /**
   * Returns `already_unenrolled` when a concurrent call revoked the
   * enrollment after it was read, and then refunds nothing. A free
   * enrollment has no payment to record.
   */
  private async revokeInsideTransaction(
    tx: DbScope & ClockScope,
    courseId: string,
    customerId: string,
    enrollment: EnrollmentRecord,
  ): Promise<UnenrollOutcome> {
    const { paymentId } = enrollment;
    const now = await this.clock.now(tx);

    const wasRevoked = await this.enrollmentsRepository.revokeEnrollment(tx, {
      courseId,
      customerId,
      paymentId,
      now,
    });

    if (!wasRevoked) {
      return "already_unenrolled";
    }

    if (paymentId) {
      await this.paymentsRepository.markPaymentRefunded(tx, paymentId, now);
    }

    return "unenrolled";
  }
}
