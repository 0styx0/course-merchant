import { cn } from "cn";

import type { priceSummary } from "./price-summary";

type PriceScheduleProps = {
  summary: ReturnType<typeof priceSummary>;
};

/** The price rows read back as a list, one line per price; see `priceSummary`. */
export function PriceSchedule({ summary }: PriceScheduleProps) {
  return (
    <div aria-live="polite" className="text-sm">
      <p className="font-medium">Price schedule ({summary.timeZone})</p>
      <ol className="list-[upper-roman] pl-6">
        {summary.lines.map((parts, index) => (
          <li key={index}>
            {parts.map(({ text, isError }, partIndex) => (
              <span
                key={partIndex}
                className={cn(isError && "text-destructive")}
              >
                {text}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
