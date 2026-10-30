"use client";

import type { FieldPathByValue, FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";

import {
  InputField,
  type CourseFormApi,
} from "../course-form/fields/course-form-fields";
import { priceRowLabels } from "./price-row-labels";

/** The paths of a row's three boxes, each holding a string. */
type PriceRowNames<T extends FieldValues> = {
  amountDollars: FieldPathByValue<T, string>;
  effectiveDate: FieldPathByValue<T, string>;
  effectiveTimeOfDay: FieldPathByValue<T, string>;
};

type PriceRowProps<T extends FieldValues> = {
  form: CourseFormApi<T>;
  names: PriceRowNames<T>;
  index: number;
  rowCount: number;
  onRemove: () => void;
};

function RemoveRowButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onRemove}
      className="self-start sm:mt-6"
      aria-label={`Remove ${label.toLowerCase()}`}
    >
      Remove
    </Button>
  );
}

/** One line of the price schedule: an amount and when it takes effect. */
export function PriceRow<T extends FieldValues>({
  form,
  names,
  index,
  rowCount,
  onRemove,
}: PriceRowProps<T>) {
  const labels = priceRowLabels(index, rowCount);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_5rem]">
      <InputField
        form={form}
        name={names.amountDollars}
        label={labels.amountDollars}
        prefix="$"
      />
      <InputField
        form={form}
        name={names.effectiveDate}
        label={labels.effectiveDate}
        type="date"
      />
      <InputField
        form={form}
        name={names.effectiveTimeOfDay}
        label={labels.effectiveTimeOfDay}
        type="time"
      />
      {rowCount > 1 && (
        <RemoveRowButton label={labels.amountDollars} onRemove={onRemove} />
      )}
    </div>
  );
}
