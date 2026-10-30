"use client";

import type { UseFieldArrayReturn } from "react-hook-form";

import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/sections/course-form-fields";
import {
  PricingSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import { ScheduleProblems } from "../course-form/sections/schedule-problems";
import { PriceRow, type PriceRowNames } from "../price/price-row";
import type { priceSummary } from "../price/price-summary";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

const scheduleNames: ScheduleDateTimeNames<CourseFormWithImageValues> = {
  startDate: "schedule.startDate",
  startTimeOfDay: "schedule.startTimeOfDay",
  endDate: "schedule.endDate",
  endTimeOfDay: "schedule.endTimeOfDay",
};

/** Create's schedule: the cross-field messages, the zone, and the four date and time boxes. */
export function CreateScheduleSection({
  form,
  timeZones,
  scheduleText,
}: {
  form: CourseFormApi<CourseFormWithImageValues>;
  timeZones: string[];
  scheduleText: string | undefined;
}) {
  return (
    <ScheduleSection scheduleText={scheduleText}>
      <ScheduleProblems
        form={form}
        names={[scheduleNames.startTimeOfDay, scheduleNames.endTimeOfDay]}
      />
      <TimeZoneField
        form={form}
        name="schedule.timeZone"
        recheck={["schedule", "prices"]}
        timeZones={timeZones}
      />
      <ScheduleDateTimeFields form={form} names={scheduleNames} />
    </ScheduleSection>
  );
}

/** What a price row looks like before anything is typed in it. */
export const emptyPrice = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

function priceRowNames(
  index: number,
): PriceRowNames<CourseFormWithImageValues> {
  return {
    amountDollars: `prices.${index}.amountDollars`,
    effectiveDate: `prices.${index}.effectiveDate`,
    effectiveTimeOfDay: `prices.${index}.effectiveTimeOfDay`,
  };
}

/** Create's pricing: one row per price, and a removal that checks the rest again. */
export function CreatePricingSection({
  form,
  priceRows,
  summary,
}: {
  form: CourseFormApi<CourseFormWithImageValues>;
  priceRows: UseFieldArrayReturn<CourseFormWithImageValues, "prices">;
  summary: ReturnType<typeof priceSummary>;
}) {
  function removeRow(index: number) {
    priceRows.remove(index);
    // A "same time as another row" error may now be gone.
    void form.trigger("prices");
  }

  return (
    <PricingSection
      onAddPrice={() => priceRows.append(emptyPrice)}
      summary={summary}
    >
      {priceRows.fields.map((row, index) => (
        <PriceRow
          key={row.id}
          form={form}
          names={priceRowNames(index)}
          index={index}
          rowCount={priceRows.fields.length}
          onRemove={() => removeRow(index)}
        />
      ))}
    </PricingSection>
  );
}
