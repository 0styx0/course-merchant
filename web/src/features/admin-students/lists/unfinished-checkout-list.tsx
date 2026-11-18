"use client";

import { useVisitorTimeZone } from "@/features/courses/course-time/use-visitor-time-zone";
import type { AdminCustomer } from "@/lib/types";
import { dateOnlyFormatter } from "@/lib/utils/formatters";

type UnfinishedCustomer = Pick<
  AdminCustomer,
  "id" | "name" | "email" | "latestCheckoutStartedAt"
>;

const unfinishedHeadingId = "unfinished-checkouts-heading";

// en-US like the course page's dates, so the admin reads one date style.
function formatCheckoutDay(isoTime: string, timeZone: string) {
  return dateOnlyFormatter(timeZone, "en-US").format(new Date(isoTime));
}

// Shown only once the browser's zone is known, so the server's HTML and the
// first browser render match.
function CheckoutDay({
  startedAt,
  timeZone,
}: {
  startedAt: string | null;
  timeZone: string | undefined;
}) {
  if (startedAt === null || timeZone === undefined) return null;
  return (
    <>
      <span aria-hidden="true">{" · "}</span>
      <span>{formatCheckoutDay(startedAt, timeZone)}</span>
    </>
  );
}

function UnfinishedCheckoutRow({
  customer,
  timeZone,
}: {
  customer: UnfinishedCustomer;
  timeZone: string | undefined;
}) {
  return (
    <li className="flex flex-wrap">
      <span className="font-medium">{customer.name}</span>
      <span aria-hidden="true">{" · "}</span>
      <span className="wrap-anywhere text-muted-foreground">
        {customer.email}
      </span>
      <CheckoutDay
        startedAt={customer.latestCheckoutStartedAt}
        timeZone={timeZone}
      />
    </li>
  );
}

/**
 * Customers who started a checkout and never paid, in the order given (the
 * page orders them with `selectUnfinishedCheckouts`), each with the
 * day of their latest checkout in the browser's time zone. Shows nothing for
 * an empty list.
 */
export function UnfinishedCheckoutList({
  customers,
}: {
  customers: UnfinishedCustomer[];
}) {
  const visitorTimeZone = useVisitorTimeZone();
  if (customers.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 id={unfinishedHeadingId} className="font-heading text-h3">
        Unfinished checkouts ({customers.length})
      </h2>
      <p className="mt-2 text-muted-foreground">
        Started a checkout and never paid.
      </p>
      <ul aria-labelledby={unfinishedHeadingId} className="mt-4 space-y-3">
        {customers.map((customer) => (
          <UnfinishedCheckoutRow
            key={customer.id}
            customer={customer}
            timeZone={visitorTimeZone}
          />
        ))}
      </ul>
    </section>
  );
}
