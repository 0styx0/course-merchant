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
      - **suspended:** queue "access suspended" with `refundIssued: true`.
3. Once the database changes are saved, refund a double purchase or a suspended buyer's payment, keyed by our payment id. A successful refund marks the payment `refunded` (`PaymentRefunds`). If the refund fails, still reply 200; the sweeper retries it.
4. Reply 2xx quickly. Emails are sent by the outbox worker, never during the request.

**Two layers of duplicate protection:**
- `ProcessedPaymentEvent` catches Stripe sending the same event again.
- The conditional updates catch the webhook and the sweeper racing each other. The sweeper has no event id (`fulfillRetrievedCheckout` records none), so the event table can't protect against that race.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Expiry is its own `ExpiryService`, and records the event even though `markPaymentExpired` is idempotent | Fulfillment stays about granting access; recording keeps redelivery handling identical across event types | A method on `FulfillmentService`; skipping the event record |
| The webhook finds the payment by our id (`client_reference_id`) | Still works if saving the session id failed | Looking it up by session id |
| The Stripe client pins `apiVersion` in code, and the production webhook endpoint uses the same version | Webhook payloads follow the endpoint's version, not the SDK's; a mismatch makes events disagree with the SDK's types and nothing at compile time notices. The SDK types the option as its own version, so an upgrade fails `tsc` until the pin and the endpoint are updated on purpose | Relying on the SDK default (invisible, and it changes silently on upgrade); an env var (one more value to keep in step) |
| A double purchase (two checkouts started, then both paid) gets an automatic refund once the database changes are saved | Rare, costs about one commit plus one sweeper rule, and the owner never has to act. Stripe keeps its fee either way | Doing nothing (the owner finds out from a complaint); emailing the owner to refund by hand (a new email kind and migration, plus ongoing owner work) |
| `purchasedAt` is passed in by the caller, not left to the DB default | A webhook that arrives late can record the payment time from Stripe's event, not the processing time | DB `now()` |
| `markPaymentSucceeded` always sets `providerCheckoutId` | A payment has one session (idempotency key `checkout-<paymentId>`), so setting it equals filling it when missing, in one statement | A second update for a missing id only |
| `findPaymentForFulfillment` doesn't return the payment's status | The guarded transition decides; an early status check would be a second answer that can race | Checking status before the update |
| `FulfillmentService` takes a provider-neutral `CompletedCheckout`; `completedCheckoutFromEvent` in `stripe/stripe.service.ts` maps Stripe's event to it | Stripe's shapes stay in one file, and the sweeper can fulfill from a retrieved session that has no event | Passing `Stripe.CheckoutSessionCompletedEvent` into the service |
| A completed checkout that is unpaid, or whose `client_reference_id` is missing, not a UUID, or unknown, is recorded and ignored | It isn't a paid checkout we started. A non-UUID id would make Postgres throw, so Stripe would retry for days | Failing the webhook |
| A paid session without a payment intent throws | It breaks Stripe's own invariant; failing makes Stripe retry and puts it in the logs | Ignoring it |
| Two payments for one course fulfilled concurrently: the one that loses `grantAccess` stops with no email or refund, and the sweeper's refund rule (see [refunds.md](refunds.md)) picks it up | Rare; keeps fulfillment a straight line. Accepted cost: that payment gets no `already_owned` email | Re-reading the enrollment and re-dispatching to the double-purchase path |
| `fulfillCheckout` returns `void`; the refund decision is internal | The webhook only needs "handled"; the step that runs after the changes are saved belongs to the service, so the controller and sweeper don't repeat it | Returning the decision to the controller |
| Any refund failure is logged and swallowed, not just `PaymentProviderUnavailableError` | The event is already recorded, so Stripe redelivering it would do nothing; the sweeper owns the retry | Failing the webhook so Stripe retries |
| Every refund carries `metadata.paymentId` and `metadata.refundCause` (`double_purchase` or `suspended_access`); only a double purchase sends `reason: "duplicate"` | Labels it in the Dashboard for the accountant and shows our id; `charge.refunded` still finds the payment by payment intent, not by this metadata | No reason or metadata |
| A payment from a buyer whose enrollment is suspended is refunded once the database changes are saved, like a double purchase, and the enrollment stays suspended | The buyer can't use what they paid for, and waiting for the sweeper left it unrecorded as intended. The refund sends no Stripe `reason`: none of `duplicate`, `fraudulent` and `requested_by_customer` fits. The enrollment points at the disputed payment, so the later `charge.refunded` for this payment finds no enrollment and revokes nothing | Revoking the enrollment (it would let the buyer buy again before the owner clears the dispute); waiting for the sweeper |
| `access_suspended` carries `refundIssued`: true from fulfillment, false from checkout | There is no payment at checkout, so nothing to refund. Rows queued before this change lack the field and render without the refund line | A separate email kind |
| Fulfillment emails aren't capped per address | Only a real payment queues them, and a buyer who paid must get the link | Reusing checkout's cap |
| The controller maps `InvalidWebhookSignatureError` to `INVALID_WEBHOOK_SIGNATURE` itself, and a missing `rawBody` is verified as an empty body | Only this controller needs the mapping; an empty body fails the signature check, so there is no separate case | An exception filter; a special case for a missing body |
| Unhandled event types are acknowledged with 200 | Stripe retries non-2xx for days; an event we don't act on needs no retry | 400 or 501 |
| `FulfillmentService` and the sweeper refund through `PaymentRefunds`, which marks the payment `refunded` after Stripe accepts | One place decides what "refunded" means in our records, and the sweeper stops retrying it. A refund that fails leaves the payment `succeeded` | Marking it from the `charge.refunded` event only |
