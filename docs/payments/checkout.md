# Payments: checkout

Read this before working on `POST /v1/checkout-sessions`, the already-owned handling or the email cap. Part of [payments.md](../payments.md), which holds the status checklist and principles.

## Flow

**Checkout (built).** The course is loaded with the shared visibility rule, and the price is read on the server. A course that has ended returns 409 `COURSE_NOT_PURCHASABLE`. The customer is found or created by lowercased email. Then it depends on the customer's existing enrollment:

| Enrollment | Response | What happens |
|---|---|---|
| Active | `check_email` | Queues an "already owned" email with the link |
| Suspended | `check_email` | Queues an "access suspended" email with no link |
| Revoked, or none | Free: `check_email` | Grants or reactivates access and queues the access email |
| Revoked, or none | Paid: `redirect` | Creates a pending `Payment`, then the Stripe session (idempotency key `checkout-<paymentId>`, 31-minute expiry), then saves the session id |

An address that has received 5 or more emails in the last 24 hours (counted from `EmailOutbox`) still gets `check_email`, but nothing is queued.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Guest checkout; a customer is identified by lowercased email | No Stripe Customer objects to sync; saved cards would be the biggest lock-in risk | Stripe Customers, `PaymentProviderCustomer` (dropped) |
| The customer keeps the first name given; Stripe's payer name is ignored | Simple, and the name isn't used for anything that matters | Overwriting it on each purchase |
| `check_email` for every outcome that doesn't redirect | Doesn't reveal whether an address owns a course | Telling the buyer "already owned". Accepted leak: for a paid course, an owner gets `check_email` while a new buyer gets `redirect` |
| Email cap per address, counted from `EmailOutbox` | The API can enforce it accurately; per-IP limits can't be, because the API only sees the Next server's address | — |
| Card only, no delayed methods | Payment is confirmed instantly, so there's no "processing" state | ACH and bank debits |
| Currencies limited to the payout currency (`ALLOWED_CURRENCIES`, default USD) | Any other currency adds a conversion fee to every sale | Accepting any currency |
| Checkout split into the service (entry and transaction), a decision service, a Stripe redirect service and a capped email queue | Each has its own rules and constants, and "commit, then call Stripe" now sits in the one method `startCheckout` | One class; splitting the spec in the same commit |
