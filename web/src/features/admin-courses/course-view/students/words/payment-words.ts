import type { AdminCourse } from "@/lib/types";

type PaymentStatus = NonNullable<
  AdminCourse["enrollments"][number]["payment"]
>["status"];

/** A payment's status as the admin page names and colours it. */
export type PaymentWords = {
  word: "Paid" | "Refunded" | "Pending" | "Expired";
  colourPair: "success" | "muted";
};

const paymentWordsByStatus: Record<PaymentStatus, PaymentWords> = {
  succeeded: { word: "Paid", colourPair: "success" },
  refunded: { word: "Refunded", colourPair: "muted" },
  pending: { word: "Pending", colourPair: "muted" },
  expired: { word: "Expired", colourPair: "muted" },
};

/** Paid is green; Refunded, Pending and Expired are grey. */
export function paymentWords(status: PaymentStatus): PaymentWords {
  return paymentWordsByStatus[status];
}
