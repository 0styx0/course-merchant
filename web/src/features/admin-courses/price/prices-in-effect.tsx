import { useId } from "react";

import { storedPriceStartMs } from "./split-prices-by-start";
import { formatMoment } from "../schedule/summary/format-moment";
import type { LoadedPrice } from "../validation/edit-course-form-schema";
import { formatCents } from "./price-summary";

type PricesInEffectProps = {
  prices: LoadedPrice[];
  timeZone: string;
};

/** "$99.00 from Oct 15, 2026, 2:31 PM": one stored price as the list shows it. */
function priceInEffectText(price: LoadedPrice, timeZone: string): string {
  const amount = formatCents(price.amount);
  return `${amount} from ${formatMoment(storedPriceStartMs(price), timeZone)}`;
}

/**
 * The prices that had started when the page loaded, oldest first, read-only
 * because the API keeps them whatever the page sends. Nothing when none has.
 */
export function PricesInEffect({ prices, timeZone }: PricesInEffectProps) {
  const headingId = useId();
  if (prices.length === 0) return null;
  const oldestFirst = prices.toSorted(
    (a, b) => storedPriceStartMs(a) - storedPriceStartMs(b),
  );
  const latestIndex = oldestFirst.length - 1;

  return (
    <div className="text-sm">
      <p id={headingId} className="font-medium">
        Prices in effect ({timeZone})
      </p>
      <ul aria-labelledby={headingId} className="list-disc pl-6">
        {oldestFirst.map((price, index) => (
          <li key={price.effectiveAt}>
            {priceInEffectText(price, timeZone)}
            {index === latestIndex && " (current price)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
