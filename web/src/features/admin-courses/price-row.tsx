"use client";

import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";

import { InputField } from "./course-form-fields";
import { priceRowLabels } from "./course-form-problems";
import type { CourseFormValues } from "./course-form-schema";

type PriceRowProps = {
  form: UseFormReturn<CourseFormValues>;
  index: number;
  rowCount: number;
  onRemove: () => void;
};

/** One line of the price schedule: an amount and when it takes effect. */
export function PriceRow({ form, index, rowCount, onRemove }: PriceRowProps) {
  const labels = priceRowLabels(index, rowCount);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <InputField
        form={form}
        name={`prices.${index}.amountDollars`}
        label={labels.amountDollars}
      />
      <InputField
        form={form}
        name={`prices.${index}.effectiveDate`}
        label={labels.effectiveDate}
        type="date"
        description="Leave the date and time empty to start when the course is published."
      />
      <InputField
        form={form}
        name={`prices.${index}.effectiveTimeOfDay`}
        label={labels.effectiveTimeOfDay}
        type="time"
      />
      <Button
        type="button"
        variant="outline"
        disabled={rowCount === 1}
        onClick={onRemove}
        className="self-start sm:mt-6"
        aria-label={`Remove ${labels.amountDollars.toLowerCase()}`}
      >
        Remove
      </Button>
    </div>
  );
}
