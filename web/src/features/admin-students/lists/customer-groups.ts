import type { AdminCustomer } from "@/lib/types";

/**
 * The students: customers with at least one enrollment, even a suspended or
 * un-enrolled one, in the order given.
 */
export function selectStudents(customers: AdminCustomer[]): AdminCustomer[] {
  return customers.filter((customer) => customer.enrollments.length > 0);
}
