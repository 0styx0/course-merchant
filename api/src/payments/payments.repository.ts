import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

type PaymentProvider = Models.public_Payment["provider"];

/** What fulfillment needs to grant access and email the buyer. */
export type FulfillmentPayment = {
  id: string;
  courseId: string;
  customer: {
    id: string;
    email: string;
  };
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
  async recordProcessedEvent(
    scope: DbScope,
    event: { provider: PaymentProvider; eventId: string; type: string },
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
}
