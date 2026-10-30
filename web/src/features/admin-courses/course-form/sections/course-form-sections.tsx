"use client";

import type { ReactNode } from "react";
import {
  Controller,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import { FormSection } from "@/components/form/form-section";
import { Button } from "@/components/ui/button";

import { InputField } from "./course-form-fields";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../../validation/course-form-limits";
import type { CourseFormWithImageValues } from "../../validation/course-form-schema";
import { ImageField } from "../../image/image-field";
import { DescriptionEditor } from "../../description-editor/description-editor";
import type { priceSummary } from "../../price/price-summary";
import { PriceRow } from "../../price/price-row";
import { PriceSchedule } from "../../price/price-schedule";

type CourseFormApi = UseFormReturn<CourseFormWithImageValues>;

/** What a price row looks like before anything is typed in it. */
export const emptyPrice = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

function DescriptionField({
  form,
  name,
  isSubmitted,
}: {
  form: CourseFormApi;
  name: "description";
  isSubmitted: boolean;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
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

function ImageInput({
  form,
  isSubmitted,
}: {
  form: CourseFormApi;
  isSubmitted: boolean;
}) {
  return (
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
  );
}

/** The course image, name, summary and description. */
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
      <ImageInput form={form} isSubmitted={isSubmitted} />
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
      <DescriptionField
        form={form}
        name="description"
        isSubmitted={isSubmitted}
      />
    </FormSection>
  );
}

/** The link to the course material. */
export function CourseMaterialSection({ form }: { form: CourseFormApi }) {
  return (
    <FormSection
      title="Course material"
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

/** The schedule's frame: its problem line, the given boxes, and the summary line. */
export function ScheduleSection({
  children,
  scheduleText,
}: {
  children: ReactNode;
  scheduleText: string | undefined;
}) {
  return (
    <FormSection
      title="Schedule"
      description="When the course runs."
      className="grid gap-4 sm:grid-cols-2"
    >
      {children}
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
      description="What students pay, in US dollars, and when each price starts. Enter 0 for a free course."
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
