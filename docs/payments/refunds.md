# Payments: refunds, disputes and the sweeper

Read this before working on `charge.refunded`, `charge.dispute.created`, revoking or suspending access, or the sweeper. Part of [payments.md](../payments.md), which holds the status checklist (steps 5 and 7), principles and launch checklist. The webhook and the double-purchase refund that the sweeper retries are in [fulfillment.md](fulfillment.md).

## Flows

**Refunds and disputes (step 7):**
- `charge.refunded` acts on **full refunds only**:
  - the payment becomes `refunded` and gets a `refundedAt`;
  - the enrollment found **by the refunded payment's id** gets a `revokedAt`.

  A partial refund changes nothing.
- `charge.dispute.created` sets `suspendedAt` and queues an alert to the owner. The owner settles the dispute in Stripe and restores access by hand. We don't subscribe to `dispute.closed`, and the payment status is left alone.

**Sweeper (step 5).** A cron job does two things:
- It re-checks payments still `pending` that were created between 1 hour and 7 days ago, by retrieving the Checkout Session and running the same fulfillment code. The 7-day limit caps the number of Stripe API calls.
- It retries missed double-purchase refunds: a succeeded payment with no enrollment pointing to it and no refund.

It also covers a payment whose session was never created.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| The refund handler finds the enrollment by the refunded payment's id | Refunding the extra payment of a double purchase can't revoke the buyer's real access | Looking it up by customer and course |
| Full refund → `revokedAt`, and the buyer may buy again (the same row is reactivated) | History stays on the refunded `Payment`, and the unique `(courseId, customerId)` key still holds | Deleting the enrollment, or inserting a second row |
| Dispute → `suspendedAt`, and the buyer can't buy again until the owner clears it | Disputes are rare; handling them by hand keeps the app simple | Automating dispute outcomes |
| Course access is the emailed `contentUrl` plus a password the owner sends each paying customer. The API doesn't gate the link: `revokedAt` and `suspendedAt` are records that checkout, fulfillment and the owner act on | The link alone isn't enough to get in. An API gate would add an endpoint and a token per enrollment, and the final URL can still be copied after the first redirect | An access endpoint (`/v1/access/{token}`) that checks the enrollment, then redirects to `contentUrl` |
