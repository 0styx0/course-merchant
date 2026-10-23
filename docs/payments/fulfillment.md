# Payments: webhooks and fulfillment

Read this before working on the Stripe webhook, `FulfillmentService`, `ExpiryService` or `PaymentsRepository`. Part of [payments.md](../payments.md), which holds the status checklist and principles. Refunds, disputes and the sweeper are in [refunds.md](refunds.md).

## Flow

**Webhook (step 3, built):**
1. Verify the signature (400 if it's invalid).
2. In one transaction:
   1. record the event id; if it's already recorded, reply 200 and stop;
   2. find the payment by `client_reference_id`;
   3. mark the payment succeeded with a conditional update;
   4. grant access and queue an email, depending on the enrollment:
      - **none:** create it;
      - **revoked:** reactivate it, pointing `paymentId` and `purchasedAt` at the new payment;
      - **active** (a double purchase from two tabs): queue "already owned" with `refundIssued: true`;
      - **suspended:** queue "access suspended".
3. After commit, refund a double purchase, keyed by our payment id. If the refund fails, still reply 200; the sweeper retries it.
4. Reply 2xx quickly. Emails are sent by the outbox worker, never during the request.

**Two layers of duplicate protection:**
- `ProcessedPaymentEvent` catches Stripe sending the same event again.
- The conditional updates catch the webhook and the sweeper racing each other. The sweeper has no event id, so the event table can't protect against that race.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Expiry is its own `ExpiryService`, and records the event even though `markPaymentExpired` is idempotent | Fulfillment stays about granting access; recording keeps redelivery handling identical across event types | A method on `FulfillmentService`; skipping the event record |
| The webhook finds the payment by our id (`client_reference_id`) | Still works if saving the session id failed | Looking it up by session id |
| A double purchase (two checkouts started, then both paid) gets an automatic refund after commit | Rare, costs about one commit plus one sweeper rule, and the owner never has to act. Stripe keeps its fee either way | Doing nothing (the owner finds out from a complaint); emailing the owner to refund by hand (a new email kind and migration, plus ongoing owner work) |
| `purchasedAt` is passed in by the caller, not left to the DB default | A webhook that arrives late can record the payment time from Stripe's event, not the processing time | DB `now()` |
| `markPaymentSucceeded` always sets `providerCheckoutId` | A payment has one session (idempotency key `checkout-<paymentId>`), so setting it equals filling it when missing, in one statement | A second update for a missing id only |
| `findPaymentForFulfillment` doesn't return the payment's status | The guarded transition decides; an early status check would be a second answer that can race | Checking status before the update |
| `FulfillmentService` takes a provider-neutral `CompletedCheckout`; `completedCheckoutFromEvent` in `stripe.service.ts` maps Stripe's event to it | Stripe's shapes stay in one file, and the sweeper can fulfill from a retrieved session that has no event | Passing `Stripe.CheckoutSessionCompletedEvent` into the service |
| A completed checkout that is unpaid, or whose `client_reference_id` is missing, not a UUID, or unknown, is recorded and ignored | It isn't a paid checkout we started. A non-UUID id would make Postgres throw, so Stripe would retry for days | Failing the webhook |
| A paid session without a payment intent throws | It breaks Stripe's own invariant; failing makes Stripe retry and puts it in the logs | Ignoring it |
| Two payments for one course fulfilled concurrently: the one that loses `grantAccess` stops with no email or refund, and the sweeper's refund rule (see [refunds.md](refunds.md)) picks it up | Rare; keeps fulfillment a straight line. Accepted cost: that payment gets no `already_owned` email | Re-reading the enrollment and re-dispatching to the double-purchase path |
| `fulfillCheckout` returns `void`; the refund decision is internal | The webhook only needs "handled"; the after-commit step belongs to the service, so the controller and sweeper don't repeat it | Returning the decision to the controller |
| Any refund failure is logged and swallowed, not just `PaymentProviderUnavailableError` | The event is already recorded, so Stripe redelivering it would do nothing; the sweeper owns the retry | Failing the webhook so Stripe retries |
| The refund uses `reason: "duplicate"` and `metadata.paymentId` | Labels it in the Dashboard for the accountant and shows our id; `charge.refunded` still finds the payment by payment intent, not by this metadata | No reason or metadata |
| Fulfillment emails aren't capped per address | Only a real payment queues them, and a buyer who paid must get the link | Reusing checkout's cap |
| The controller maps `InvalidWebhookSignatureError` to `INVALID_WEBHOOK_SIGNATURE` itself, and a missing `rawBody` is verified as an empty body | Only this controller needs the mapping; an empty body fails the signature check, so there is no separate case | An exception filter; a special case for a missing body |
| Unhandled event types are acknowledged with 200 | Stripe retries non-2xx for days; an event we don't act on needs no retry | 400 or 501 |
