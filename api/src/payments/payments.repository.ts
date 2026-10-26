import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

export type PaymentProvider = Models.public_Payment["provider"];

export type PaymentStatus = Models.public_Payment["status"];

export type PendingPayment = {
  id: string;
  amount: number;
  currency: string;
};

/** A provider's webhook event, identified by the provider's own id. */
export type ProviderEvent = {
  provider: PaymentProvider;
  eventId: string;
  type: string;
};

/** What fulfillment needs to grant access and email the buyer. */
export type FulfillmentPayment = {
  id: string;
  courseId: string;
  customer: {
    id: string;
    email: string;
  };
};

/** A paid payment that no enrollment points to, so it is owed a refund. */
export type OrphanPayment = {
  id: string;
  courseId: string;
  customerId: string;
  providerPaymentId: string;
};

/** A pending payment the provider already has a checkout for. */
export type StalePendingPayment = {
  id: string;
  providerCheckoutId: string;
};

/**
 * Records provider events and moves payments forward. Fulfillment is
 * protected against running twice by two layers, each keyed on a different id:
 *
 * - the provider's event id: `recordProcessedEvent` catches the provider
 *   delivering the same event again, such as a retry after our reply was lost.
 * - our payment id: the webhook and the sweeper can both fulfill one payment,
 *   but the sweeper reads the checkout directly and has no event id. The
 *   `status = pending` condition in each `markPayment*` update lets exactly
 *   one of them through, because the update that changes the status is the
 *   same statement that checks it. This needs `updateAndCount`: `update`
 *   reads the row first, then updates it by id alone, so two callers can both
 *   read it as pending and both update it.
 *
 * Every method returns whether this call made the change, so the caller
 * stops when it didn't.
 */
@Injectable()
export class PaymentsRepository {
  /**
   * Records a checkout attempt before the provider is called, so its id can
   * key the provider request. Amount and currency are copied from the price,
   * so a later price change never alters what this attempt charges.
   */
  async createPendingPayment(
    scope: DbScope,
    payment: {
      provider: PaymentProvider;
      customerId: string;
      coursePriceId: string;
      amount: number;
      currency: string;
    },
  ): Promise<PendingPayment> {
    return scope.orm.public.Payment.create({ ...payment, status: "pending" });
  }

  async saveProviderCheckoutId(
    scope: DbScope,
    paymentId: string,
    providerCheckoutId: string,
  ): Promise<void> {
    await scope.orm.public.Payment.where((payment) =>
      payment.id.eq(paymentId),
    ).update({ providerCheckoutId });
  }

  async findPaymentStatusByCheckoutId(
    scope: DbScope,
    provider: PaymentProvider,
    providerCheckoutId: string,
  ): Promise<PaymentStatus | null> {
    const payment = await scope.orm.public.Payment.where((candidate) =>
      and(
        candidate.provider.eq(provider),
        candidate.providerCheckoutId.eq(providerCheckoutId),
      ),
    ).first();

    return payment?.status ?? null;
  }

  async recordProcessedEvent(
    scope: DbScope,
    event: ProviderEvent,
  ): Promise<boolean> {
    // skips the insert, instead of failing, when the event is already
    // recorded: the fields name the @@id([provider, eventId]) key
    const insertedEvents =
      await scope.orm.public.ProcessedPaymentEvent.createAndCount([event], {
        onConflict: "skip",
        conflictOn: ["provider", "eventId"],
      });

    const isNewEvent = insertedEvents === 1;

    return isNewEvent;
  }

  /**
   * Looks the payment up by our id, which the provider echoes back (Stripe's
   * `client_reference_id`), so it's found even if saving the provider's
   * checkout id failed.
   */
  async findPaymentForFulfillment(
    scope: DbScope,
    paymentId: string,
  ): Promise<FulfillmentPayment | null> {
    const payment = await scope.orm.public.Payment.select("id")
      .include("customer", (customer) => customer.select("id", "email"))
      .include("coursePrice", (coursePrice) => coursePrice.select("courseId"))
      .where((candidate) => candidate.id.eq(paymentId))
      .first();

    if (!payment) {
      return null;
    }

    // always present: both foreign keys are required, but the ORM types every
    // to-one include as nullable
    return {
      id: payment.id,
      courseId: payment.coursePrice!.courseId,
      customer: payment.customer!,
    };
  }

  /**
   * Marks a pending payment as paid. `paidAt` is the provider's time for the
   * payment, not ours, so a late webhook still records when the buyer paid.
   * `providerCheckoutId` is always set: a payment has only one checkout, so
   * this fills it if saving it at checkout failed, and is a no-op otherwise.
   */
  async markPaymentSucceeded(
    scope: DbScope,
    payment: {
      id: string;
      providerCheckoutId: string;
      providerPaymentId: string;
      paidAt: Temporal.Instant;
    },
  ): Promise<boolean> {
    const { id, ...paidFields } = payment;

    // regular .update does not atomically then read the row,
    //  using updateAndCount is atomic so handles same-instant calls
    //   checking if payment succeeded
    const succeededPayments = await scope.orm.public.Payment.where(
      (candidate) => and(candidate.id.eq(id), candidate.status.eq("pending")),
    ).updateAndCount({ status: "succeeded", ...paidFields });

    return succeededPayments === 1;
  }

  async markPaymentExpired(
    scope: DbScope,
    paymentId: string,
  ): Promise<boolean> {
    const expiredPayments = await scope.orm.public.Payment.where((candidate) =>
      and(candidate.id.eq(paymentId), candidate.status.eq("pending")),
    ).updateAndCount({ status: "expired" });

    return expiredPayments === 1;
  }

  /**
   * Marks a paid payment as refunded. Guarded like every transition, so a
   * `charge.refunded` event arriving after our own refund changes nothing.
   */
  async markPaymentRefunded(
    scope: DbScope,
    paymentId: string,
    refundedAt: Temporal.Instant,
  ): Promise<boolean> {
    const refundedPayments = await scope.orm.public.Payment.where((candidate) =>
      and(candidate.id.eq(paymentId), candidate.status.eq("succeeded")),
    ).updateAndCount({ status: "refunded", refundedAt });

    return refundedPayments === 1;
  }

  /**
   * Paid payments no enrollment points to, oldest first. Fulfillment leaves
   * such a payment behind when its buyer already owned the course (a double
   * purchase, including two fulfilled at once) or is suspended, and the
   * refund for it failed or never happened.
   */
  async findOrphanPayments(
    scope: DbScope,
    limit: number,
  ): Promise<OrphanPayment[]> {
    const payments = await scope.orm.public.Payment.select(
      "id",
      "customerId",
      "providerPaymentId",
    )
      .include("coursePrice", (coursePrice) => coursePrice.select("courseId"))
      .where((candidate) =>
        and(candidate.status.eq("succeeded"), candidate.enrollment.none()),
      )
      .orderBy((candidate) => candidate.paidAt.asc())
      .limit(limit)
      .all();

    return payments.flatMap((payment) =>
      // a succeeded payment always has its payment id, and both foreign keys
      // are required, but the ORM types them as nullable
      payment.providerPaymentId
        ? [
            {
              id: payment.id,
              courseId: payment.coursePrice!.courseId,
              customerId: payment.customerId,
              providerPaymentId: payment.providerPaymentId,
            },
          ]
        : [],
    );
  }

  /**
   * Pending payments with a provider checkout that were started in the given
   * window, oldest first.
   */
  async findStalePendingPayments(
    scope: DbScope,
    window: {
      startedAfter: Temporal.Instant;
      startedBefore: Temporal.Instant;
    },
    limit: number,
  ): Promise<StalePendingPayment[]> {
    const payments = await scope.orm.public.Payment.select(
      "id",
      "providerCheckoutId",
    )
      .where((candidate) =>
        and(
          candidate.status.eq("pending"),
          candidate.providerCheckoutId.isNotNull(),
          candidate.createdAt.gt(window.startedAfter),
          candidate.createdAt.lt(window.startedBefore),
        ),
      )
      .orderBy((candidate) => candidate.createdAt.asc())
      .limit(limit)
      .all();

    return payments.flatMap((payment) =>
      payment.providerCheckoutId
        ? [{ id: payment.id, providerCheckoutId: payment.providerCheckoutId }]
        : [],
    );
  }

  /**
   * Expires pending payments started before the given time that never got a
   * provider checkout, and returns how many. Nothing can pay such a payment
   * once the provider's webhook retries have run out.
   */
  async expirePaymentsWithoutCheckout(
    scope: DbScope,
    startedBefore: Temporal.Instant,
  ): Promise<number> {
    return scope.orm.public.Payment.where((candidate) =>
      and(
        candidate.status.eq("pending"),
        candidate.providerCheckoutId.isNull(),
        candidate.createdAt.lt(startedBefore),
      ),
    ).updateAndCount({ status: "expired" });
  }
}
