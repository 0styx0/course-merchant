"use client";

import {
  Controller,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import { FormSection } from "@/components/form/form-section";
import { Button } from "@/components/ui/button";

import { InputField, TimeZoneField } from "./course-form-fields";
import { ScheduleDateTimeFields } from "./course-form-schedule-fields";
import { ScheduleProblems } from "./schedule-problems";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";
import { ImageField } from "../image/image-field";
import { DescriptionEditor } from "../description-editor/description-editor";
import type { priceSummary } from "../price/price-summary";
import { PriceRow } from "../price/price-row";
import { PriceSchedule } from "../price/price-schedule";

type CourseFormApi = UseFormReturn<CourseFormWithImageValues>;

/** What a price row looks like before anything is typed in it. */
export const emptyPrice = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

function DescriptionField({
  form,
  isSubmitted,
}: {
  form: CourseFormApi;
  isSubmitted: boolean;
}) {
  return (
    <Controller
      control={form.control}
      name="description"
      render={({ field, fieldState }) => (
        <DescriptionEditor
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          fieldRef={field.ref}
          error={fieldState.error?.message}
          touched={fieldState.isTouched}
          submitted={isSubmitted}
        />
      )}
    />
  );
}

/** The course name, summary and description. */
export function BasicsSection({
  form,
  isSubmitted,
}: {
  form: CourseFormApi;
  isSubmitted: boolean;
}) {
  return (
    <FormSection
      title="Basics"
      description="What students see when they browse for the course."
    >
      <InputField
        form={form}
        name="name"
        label="Course name"
        placeholder="e.g. Introduction to Photography"
        limit={COURSE_NAME_MAX_LENGTH}
      />
      <InputField
        form={form}
        name="summary"
        label="Summary"
        placeholder="One or two sentences shown in the course list"
        limit={COURSE_SUMMARY_MAX_LENGTH}
      />
      <DescriptionField form={form} isSubmitted={isSubmitted} />
    </FormSection>
  );
}

/** The picture shown on the course's pages. */
export function ImageSection({
  form,
  isSubmitted,
}: {
  form: CourseFormApi;
  isSubmitted: boolean;
}) {
  return (
    <FormSection
      title="Image"
      description="The picture shown with the course in the list and on its page."
    >
      <Controller
        control={form.control}
        name="image"
        render={({ field, fieldState }) => (
          <ImageField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            fieldRef={field.ref}
            error={fieldState.error?.message}
            touched={fieldState.isTouched}
            submitted={isSubmitted}
          />
        )}
      />
    </FormSection>
  );
}

/** The link to the course material. */
export function ContentSection({ form }: { form: CourseFormApi }) {
  return (
    <FormSection
      title="Content"
      description="The material students get after they buy."
    >
      <InputField
        form={form}
        name="contentUrl"
        label="Content link"
        type="url"
        description="Where students find the course material. It is never shown to the public."
      />
    </FormSection>
  );
}

/** When the course starts and ends, and the zone those times are in. */
export function ScheduleSection({
  form,
  timeZones,
  scheduleText,
}: {
  form: CourseFormApi;
  timeZones: string[];
  scheduleText: string | undefined;
}) {
  return (
    <FormSection
      title="Schedule"
      description="When the course runs."
      className="grid gap-4 sm:grid-cols-2"
    >
      <ScheduleProblems form={form} />
      <ScheduleDateTimeFields form={form} />
      <TimeZoneField form={form} timeZones={timeZones} />
      <p aria-live="polite" className="text-sm sm:col-span-2">
        {scheduleText}
      </p>
    </FormSection>
  );
}

/** The price rows, the button to add one, and the summary of them. */
export function PricingSection({
  form,
  priceRows,
  summary,
}: {
  form: CourseFormApi;
  priceRows: UseFieldArrayReturn<CourseFormWithImageValues, "prices">;
  summary: ReturnType<typeof priceSummary>;
}) {
  function removeRow(index: number) {
    priceRows.remove(index);
    // A "same time as another row" error may now be gone.
    void form.trigger("prices");
  }

  return (
    <FormSection
      title="Pricing"
      description="What students pay, in US dollars, and when each price starts."
      help="Leave the date and time empty to start when the course is published."
    >
      {priceRows.fields.map((row, index) => (
        <PriceRow
          key={row.id}
          form={form}
          index={index}
          rowCount={priceRows.fields.length}
          onRemove={() => removeRow(index)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => priceRows.append(emptyPrice)}
        className="self-start"
      >
        Add price
      </Button>
      <PriceSchedule summary={summary} />
    </FormSection>
  );
}
