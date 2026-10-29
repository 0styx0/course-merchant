# Payments: refunds, disputes and the sweeper

Read this before working on `charge.refunded`, `charge.dispute.created`, revoking or suspending access, or the sweeper. Part of [payments.md](../payments.md), which holds the status checklist (steps 5 and 7), principles and launch checklist. The webhook and the double-purchase refund that the sweeper retries are in [fulfillment.md](fulfillment.md).

## Flows

**Refunds and disputes (step 7):**
- `charge.refunded` acts on **full refunds only**:
  - the payment becomes `refunded` and gets a `refundedAt`;
  - the enrollment found **by the refunded payment's id** gets a `revokedAt`.

  A partial refund changes nothing.
- `charge.dispute.created` sets `suspendedAt` and queues an alert to the owner. The owner settles the dispute in Stripe and restores access by hand. We don't subscribe to `dispute.closed`, and the payment status is left alone.

**Sweeper (step 5, built).** [payment-sweeper.ts](../../api/src/payments/sweeper/payment-sweeper.ts) runs every 10 minutes on every API server, with three independent checks: refund orphan payments, recheck overdue pending payments, expire payments that never got a checkout. The rules and numbers are in the decision rows below.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| The refund handler finds the enrollment by the refunded payment's id | Refunding the extra payment of a double purchase can't revoke the buyer's real access | Looking it up by customer and course |
| Full refund → `revokedAt`, and the buyer may buy again (the same row is reactivated) | History stays on the refunded `Payment`, and the unique `(courseId, customerId)` key still holds | Deleting the enrollment, or inserting a second row |
| Dispute → `suspendedAt`, and the buyer can't buy again until the owner clears it | Disputes are rare; handling them by hand keeps the app simple | Automating dispute outcomes |
| Course access is the emailed `contentUrl` plus a password the owner sends each paying customer. The API doesn't gate the link: `revokedAt` and `suspendedAt` are records that checkout, fulfillment and the owner act on | The link alone isn't enough to get in. An API gate would add an endpoint and a token per enrollment, and the final URL can still be copied after the first redirect | An access endpoint (`/v1/access/{token}`) that checks the enrollment, then redirects to `contentUrl` |
| An **orphan payment** is a `succeeded` payment that no enrollment points to, and one query finds all three refund cases | Fulfillment leaves exactly these behind: a double purchase and a suspended buyer (the enrollment points at the other payment), and the loser of two payments fulfilled at once (no enrollment of its own). No column to record "refund owed" | A flag or retry counter per payment (state that can drift, plus a migration) |
| The sweeper works out the refund cause again from the buyer's enrollment: `suspended_access` if it's suspended, otherwise `double_purchase` | The cause only labels the refund in Stripe and picks the `reason`, so recomputing it is cheap and needs nothing stored | Storing the cause on the payment |
| `PaymentRefunds` marks the payment `refunded` right after Stripe accepts the refund, with a guarded `succeeded → refunded` update | Otherwise the sweeper would pick the payment again every run. A later `charge.refunded` finds it already `refunded` and does nothing | Leaving it `succeeded` until `charge.refunded` arrives |
| `refundPayment` treats Stripe's `charge_already_refunded` error code as success | Stripe forgets an idempotency key after about 24 hours, so a retry can reach a charge that is already refunded. The payment is then marked `refunded` and the sweeper stops selecting it | Relying on the idempotency key alone |
| A pending payment with a Stripe checkout is asked about once it is over 1 hour old, and not after 7 days | An hour gives the webhook time to arrive. The 7-day limit caps Stripe calls: a session expires in 31 minutes, so an older payment has already had its `expired` event | Asking about every pending payment; a shorter limit |
| The sweeper fulfills a completed checkout with `fulfillRetrievedCheckout`, which records no event, and takes `paidAt` from the charge's creation time | There's no event id, so the guarded `pending → succeeded` update alone stops the webhook and the sweeper both fulfilling it. The charge time is when the buyer paid, not when the sweep ran | Recording a made-up event id; using the sweep time |
| A pending payment with no checkout is expired only once it is over 3 days old | Stripe can't look a session up by our payment id, so the session may exist and be paid with its webhook delayed. Expiring earlier would make the late `completed` webhook find a payment that isn't pending, so the buyer pays and gets nothing. 3 days is Stripe's webhook retry window in live mode. No upper age and no Stripe call | Expiring after 1 hour |
| Every API server runs the sweeper, with no lock | Two servers may ask Stripe about the same payment or send the same refund, but the guarded updates and the `refund-<paymentId>` key make that harmless | A database lock or choosing one server |
| Each check takes at most 20 payments per run, and a failed payment is logged and skipped | Bounds the Stripe calls and the damage if a bug ever dropped enrollments, and one bad payment can't block the rest. The log line is the alert, as for failed emails | An attempt counter column |
