import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import {
  EnrollmentAccess,
  enrollmentAccess,
} from "@/enrollments/enrollment-access.js";
import { errorStack } from "@/common/errors/error-text.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import type { RetrievedCheckout } from "./checkout-events.js";
import { FulfillmentService } from "./fulfillment.service.js";
import { PaymentRefunds } from "./payment-refunds.js";
import {
  PaymentsRepository,
  type OrphanPayment,
  type StalePendingPayment,
} from "./payments.repository.js";
import { StripeService, type RefundCause } from "./stripe.service.js";

// how often the sweeper runs, and how many payments each check takes per run
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const BATCH_SIZE = 20;

// A pending payment is asked about only once its webhook is overdue, and only
// while it's young enough for Stripe to still have the checkout. The upper
// limit caps the number of Stripe calls.
const RECHECK_PENDING_AFTER_HOURS = 1;
const RECHECK_PENDING_UNTIL_HOURS = 7 * 24;

// Stripe retries a webhook for about 3 days in live mode. A payment with no
// checkout may still be paid, with its webhook on the way, until then.
const WEBHOOK_RETRY_WINDOW_HOURS = 3 * 24;

/**
 * Puts right the payments the webhook couldn't. Every few minutes it runs
 * three independent checks, and a failure in one payment or check doesn't
 * stop the others:
 *
 * 1. refunds paid payments that no enrollment points to (a double purchase, a
 *    suspended buyer, or two payments fulfilled at once) whose refund failed;
 * 2. asks Stripe about pending payments whose webhook is overdue, and
 *    fulfills or expires them the way the webhook would;
 * 3. expires pending payments that never got a Stripe checkout.
 *
 * Every API server runs it. That's safe: payment changes are conditional
 * updates, and a refund is keyed by the payment id.
 */
@Injectable()
export class PaymentSweeper implements OnApplicationShutdown {
  private readonly logger = new Logger(PaymentSweeper.name);
  private currentRun: Promise<void> | null = null;
  private isStopping = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EnrollmentsRepository)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    @Inject(FulfillmentService)
    private readonly fulfillment: FulfillmentService,
    @Inject(PaymentRefunds)
    private readonly paymentRefunds: PaymentRefunds,
    @Inject(StripeService)
    private readonly stripeService: StripeService,
    @Inject(DatabaseClock)
    private readonly clock: DatabaseClock,
  ) {}

  /** Skips the run when the previous one hasn't finished or we're stopping. */
  @Interval(SWEEP_INTERVAL_MS)
  async runIfIdle(): Promise<void> {
    if (this.currentRun || this.isStopping) {
      return;
    }

    this.currentRun = this.sweep();

    try {
      await this.currentRun;
    } finally {
      this.currentRun = null;
    }
  }

  /** Starts no new run and waits for the current one to finish. */
  async onApplicationShutdown(): Promise<void> {
    this.isStopping = true;

    await this.currentRun;
  }

  async sweep(): Promise<void> {
    await this.runCheck("refund unrefunded payments", () =>
      this.refundOrphanPayments(),
    );
    await this.runCheck("recheck overdue pending payments", () =>
      this.recheckPendingPayments(),
    );
    await this.runCheck("expire payments without a checkout", () =>
      this.expireAbandonedPayments(),
    );
  }

  private async runCheck(
    name: string,
    check: () => Promise<void>,
  ): Promise<void> {
    try {
      await check();
    } catch (error) {
      // e.g. the database is down; the next run tries again
      this.logger.error(`Couldn't ${name}`, errorStack(error));
    }
  }

  private async refundOrphanPayments(): Promise<void> {
    const payments = await this.paymentsRepository.findOrphanPayments(
      this.prisma.db,
      BATCH_SIZE,
    );

    for (const payment of payments) {
      if (this.isStopping) {
        return;
      }

      await this.refundOrphanPayment(payment);
    }
  }

  private async refundOrphanPayment(payment: OrphanPayment): Promise<void> {
    try {
      await this.paymentRefunds.refund({
        paymentId: payment.id,
        providerPaymentId: payment.providerPaymentId,
        cause: await this.refundCause(payment),
      });
      this.logger.warn(`Refunded payment ${payment.id} that had no access.`);
    } catch (error) {
      this.logger.error(
        `Couldn't refund payment ${payment.id}; the next run retries it.`,
        errorStack(error),
      );
    }
  }

  private async refundCause(payment: OrphanPayment): Promise<RefundCause> {
    const enrollment = await this.enrollmentsRepository.findEnrollment(
      this.prisma.db,
      payment.courseId,
      payment.customerId,
    );

    return enrollment &&
      enrollmentAccess(enrollment) === EnrollmentAccess.SUSPENDED
      ? "suspended_access"
      : "double_purchase";
  }

  private async recheckPendingPayments(): Promise<void> {
    const now = await this.clock.now(this.prisma.db);
    const payments = await this.paymentsRepository.findStalePendingPayments(
      this.prisma.db,
      {
        startedAfter: now.subtract({ hours: RECHECK_PENDING_UNTIL_HOURS }),
        startedBefore: now.subtract({ hours: RECHECK_PENDING_AFTER_HOURS }),
      },
      BATCH_SIZE,
    );

    for (const payment of payments) {
      if (this.isStopping) {
        return;
      }

      await this.recheckPendingPayment(payment);
    }
  }

  private async recheckPendingPayment(
    payment: StalePendingPayment,
  ): Promise<void> {
    try {
      const checkout = await this.stripeService.retrieveCheckout(
        payment.providerCheckoutId,
      );

      await this.settle(payment, checkout);
    } catch (error) {
      this.logger.error(
        `Couldn't recheck pending payment ${payment.id}; the next run retries it.`,
        errorStack(error),
      );
    }
  }

  private async settle(
    payment: StalePendingPayment,
    checkout: RetrievedCheckout,
  ): Promise<void> {
    switch (checkout.state) {
      case "open":
        return;
      case "expired":
        await this.paymentsRepository.markPaymentExpired(
          this.prisma.db,
          payment.id,
        );
        return;
      case "completed":
        this.logger.warn(
          `Fulfilling payment ${payment.id}: its webhook never arrived.`,
        );
        await this.fulfillment.fulfillRetrievedCheckout(checkout.completion);
        return;
    }
  }

  private async expireAbandonedPayments(): Promise<void> {
    const now = await this.clock.now(this.prisma.db);
    const expired = await this.paymentsRepository.expirePaymentsWithoutCheckout(
      this.prisma.db,
      now.subtract({ hours: WEBHOOK_RETRY_WINDOW_HOURS }),
    );

    if (expired > 0) {
      this.logger.log(`Expired ${expired} payments that had no checkout.`);
    }
  }
}
