import { formatCents } from "@/features/admin-courses/price/price-summary";
import { storedPriceStartMs } from "@/features/admin-courses/price/split-prices-by-start";
import { formatMoment } from "@/features/admin-courses/schedule/summary/format-moment";
import type { AdminCourse } from "@/lib/types";

type AdminCoursePrice = AdminCourse["prices"][number];

type AdminPriceLinesProps = {
  /** The prices that have started, oldest first; the last is the price now. */
  pricesInEffect: AdminCourse["prices"];
  /** The prices that start later, oldest first. */
  scheduledPrices: AdminCourse["prices"];
  timeZone: string;
};

/** "Price now: $99.00", or "No price in effect yet" when every price starts later. */
function PriceNowLine({ priceInEffect }: { priceInEffect?: AdminCoursePrice }) {
  if (!priceInEffect) return <p className="mt-4">No price in effect yet</p>;
  return (
    <p className="mt-4 font-semibold">
      Price now: {formatCents(priceInEffect.amount)}
    </p>
  );
}

/** Each price that starts later, as "$129.00 from Mar 1, 2099, 9:00 AM", under a heading. */
function ScheduledPriceList({
  scheduledPrices,
  timeZone,
}: {
  scheduledPrices: AdminCourse["prices"];
  timeZone: string;
}) {
  if (scheduledPrices.length === 0) return null;
  return (
    <>
      <h2 className="mt-4 font-medium">Scheduled prices</h2>
      <ul className="mt-1 text-sm">
        {scheduledPrices.map((price) => (
          <li key={price.id}>
            {formatCents(price.amount)} from{" "}
            {formatMoment(storedPriceStartMs(price), timeZone)}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The price in effect, then the prices that start later. */
export function AdminPriceLines({
  pricesInEffect,
  scheduledPrices,
  timeZone,
}: AdminPriceLinesProps) {
  return (
    <>
      <PriceNowLine priceInEffect={pricesInEffect.at(-1)} />
      <ScheduledPriceList
        scheduledPrices={scheduledPrices}
        timeZone={timeZone}
      />
    </>
  );
}
