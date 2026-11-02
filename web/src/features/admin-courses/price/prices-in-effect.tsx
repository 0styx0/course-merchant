import { useId } from "react";

import { formatMoment } from "../schedule/summary/format-moment";
import type { LoadedPrice } from "../validation/edit-course-form-schema";
import { toDollarText } from "./dollar-amount";
import { formatDollars } from "./price-summary";

type PricesInEffectProps = {
  prices: LoadedPrice[];
  timeZone: string;
};

function startMsOf(price: LoadedPrice): number {
  return Date.parse(price.effectiveAt);
}

/** "$99 from Oct 15, 2026, 2:31 PM": one stored price as the list shows it. */
function priceInEffectText(price: LoadedPrice, timeZone: string): string {
  const amount = formatDollars(toDollarText(price.amount));
  return `${amount} from ${formatMoment(startMsOf(price), timeZone)}`;
}

/**
 * The prices that had started when the page loaded, oldest first, read-only
 * because the API keeps them whatever the page sends. Nothing when none has.
 */
export function PricesInEffect({ prices, timeZone }: PricesInEffectProps) {
  const headingId = useId();
  if (prices.length === 0) return null;
  const oldestFirst = prices.toSorted((a, b) => startMsOf(a) - startMsOf(b));
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
