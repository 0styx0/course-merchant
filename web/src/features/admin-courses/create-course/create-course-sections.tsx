"use client";

import { Controller, type UseFieldArrayReturn } from "react-hook-form";

import {
  courseFieldLabels,
  priceRowNames,
} from "../course-form/fields/course-field-labels-and-price-row-names";
import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  InputField,
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/sections/course-form-fields";
import {
  BasicsSection,
  CourseMaterialSection,
  PricingSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import { ScheduleProblems } from "../course-form/sections/schedule-problems";
import { DescriptionEditor } from "../description-editor/description-editor";
import { ImageField } from "../image/image-field";
import { PriceRow } from "../price/price-row";
import type { priceSummary } from "../price/price-summary";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

type CreateForm = CourseFormApi<CourseFormWithImageValues>;

function ImageInput({
  form,
  isSubmitted,
}: {
  form: CreateForm;
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

function DescriptionField({
  form,
  isSubmitted,
}: {
  form: CreateForm;
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

/** Create's basics: the image, name, summary and description. */
export function CreateBasicsSection({
  form,
  isSubmitted,
}: {
  form: CreateForm;
  isSubmitted: boolean;
}) {
  return (
    <BasicsSection>
      <ImageInput form={form} isSubmitted={isSubmitted} />
      <InputField
        form={form}
        name="name"
        label={courseFieldLabels.name}
        placeholder="e.g. Introduction to Photography"
        limit={COURSE_NAME_MAX_LENGTH}
      />
      <InputField
        form={form}
        name="summary"
        label={courseFieldLabels.summary}
        placeholder="One or two sentences shown in the course list"
        limit={COURSE_SUMMARY_MAX_LENGTH}
      />
      <DescriptionField form={form} isSubmitted={isSubmitted} />
    </BasicsSection>
  );
}

/** Create's course material: the content link. */
export function CreateCourseMaterialSection({ form }: { form: CreateForm }) {
  return (
    <CourseMaterialSection>
      <InputField
        form={form}
        name="contentUrl"
        label={courseFieldLabels.contentUrl}
        type="url"
        description="Where students find the course material. It is never shown to the public."
      />
    </CourseMaterialSection>
  );
}

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
