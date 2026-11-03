"use client";

import type { FieldPathByValue, FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";

import { makeRecheckingChangeHandler } from "../course-form/fields/recheck-on-change";
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

/** What a price row looks like before anything is typed in it. */
export const emptyPriceRow = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

type PriceRowProps<T extends FieldValues> = {
  form: CourseFormApi<T>;
  names: PriceRowNames<T>;
  /** Every price box of every row, so a change re-checks the ones already reached. */
  boxNamesToRecheck: FieldPathByValue<T, string>[];
  index: number;
  rowCount: number;
  canRemove: boolean;
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
      className="self-start sm:mt-8"
      aria-label={`Remove ${label.toLowerCase()}`}
    >
      Remove
    </Button>
  );
}

type PriceRowBoxProps<T extends FieldValues> = {
  form: CourseFormApi<T>;
  name: FieldPathByValue<T, string>;
  label: string;
  boxNamesToRecheck: FieldPathByValue<T, string>[];
  type?: "date" | "time";
  prefix?: string;
};

/** One box of a price row; a change re-checks every price box already reached. */
function PriceRowBox<T extends FieldValues>({
  form,
  name,
  boxNamesToRecheck,
  ...inputProps
}: PriceRowBoxProps<T>) {
  return (
    <InputField
      form={form}
      name={name}
      registerOptions={{
        onChange: makeRecheckingChangeHandler(form, name, boxNamesToRecheck),
      }}
      {...inputProps}
    />
  );
}

/** One line of the price schedule: an amount and when it takes effect. */
export function PriceRow<T extends FieldValues>({
  form,
  names,
  boxNamesToRecheck,
  index,
  rowCount,
  canRemove,
  onRemove,
}: PriceRowProps<T>) {
  const labels = priceRowLabels(index, rowCount);
  const boxProps = { form, boxNamesToRecheck };
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-start">
      <PriceRowBox
        {...boxProps}
        name={names.amountDollars}
        label={labels.amountDollars}
        prefix="$"
      />
      <PriceRowBox
        {...boxProps}
        name={names.effectiveDate}
        label={labels.effectiveDate}
        type="date"
      />
      <PriceRowBox
        {...boxProps}
        name={names.effectiveTimeOfDay}
        label={labels.effectiveTimeOfDay}
        type="time"
      />
      {canRemove && (
        <RemoveRowButton label={labels.amountDollars} onRemove={onRemove} />
      )}
    </div>
  );
}
