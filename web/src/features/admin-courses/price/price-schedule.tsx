import { cn } from "cn";

import type { priceSummary } from "./price-summary";

type PriceScheduleProps = {
  summary: ReturnType<typeof priceSummary>;
};

/**
 * The price rows read back as a list, one line per price; see `priceSummary`.
 * The live region is always in the page, because one added together with its
 * text is often not read out; `empty:-mt-4` cancels the form section's gap
 * while it has no content.
 */
export function PriceSchedule({ summary }: PriceScheduleProps) {
  return (
    <div aria-live="polite" className="text-sm empty:-mt-4">
      {summary && <PriceList summary={summary} />}
    </div>
  );
}

function PriceList({
  summary,
}: {
  summary: NonNullable<PriceScheduleProps["summary"]>;
}) {
  return (
    <>
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
    </>
  );
}
