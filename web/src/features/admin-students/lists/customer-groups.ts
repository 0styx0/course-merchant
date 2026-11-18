import type { AdminCustomer } from "@/lib/types";

/**
 * The students: customers with at least one enrollment, even a suspended or
 * un-enrolled one, in the order given.
 */
export function selectStudents(customers: AdminCustomer[]): AdminCustomer[] {
  return customers.filter((customer) => customer.enrollments.length > 0);
}

function startedCheckoutAtMillis(customer: AdminCustomer) {
  if (customer.latestCheckoutStartedAt === null) return null;
  return Date.parse(customer.latestCheckoutStartedAt);
}

function compareNewestCheckoutFirst(
  first: AdminCustomer,
  second: AdminCustomer,
) {
  const firstMillis = startedCheckoutAtMillis(first);
  const secondMillis = startedCheckoutAtMillis(second);
  if (firstMillis === secondMillis) return 0;
  if (firstMillis === null) return 1;
  if (secondMillis === null) return -1;
  return secondMillis - firstMillis;
}

/**
 * The unfinished checkouts: customers with no enrollment, newest checkout
 * first. A customer with no checkout time comes last, and equal times keep
 * the given order.
 */
export function selectUnfinishedCheckouts(
  customers: AdminCustomer[],
): AdminCustomer[] {
  return customers
    .filter((customer) => customer.enrollments.length === 0)
    .sort(compareNewestCheckoutFirst);
}
