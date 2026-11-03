"use client";

import { type UseFieldArrayReturn } from "react-hook-form";

import {
  courseFieldLabels,
  priceRowNames,
} from "../course-form/fields/course-field-labels-and-price-row-names";
import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  DescriptionField,
  InputField,
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/fields/course-form-fields";
import { ImageInput } from "../course-form/fields/image-input";
import {
  BasicsSection,
  PricingSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import type { ChosenImage } from "../image/course-image";
import { ImagePreview } from "../image/image-preview";
import { emptyPriceRow, PriceRow } from "../price/price-row";
import type { priceSummary } from "../price/price-summary";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

type CreateForm = CourseFormApi<CourseFormWithImageValues>;

/** Create previews only the chosen file, and keeps the preview of a refused one. */
function renderChosenFilePreview(image: ChosenImage | null) {
  if (!image || image.width === 0) return null;
  return <ImagePreview file={image.file} />;
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
      <ImageInput
        form={form}
        name="image"
        isSubmitted={isSubmitted}
        renderPreview={renderChosenFilePreview}
      />
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
      <DescriptionField form={form} name="description" />
    </BasicsSection>
  );
}

const scheduleNames: ScheduleDateTimeNames<CourseFormWithImageValues> = {
  startDate: "schedule.startDate",
  startTimeOfDay: "schedule.startTimeOfDay",
  endDate: "schedule.endDate",
  endTimeOfDay: "schedule.endTimeOfDay",
};

/** Create's schedule: the zone, and the four date and time boxes. */
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
  function removePriceRow(index: number) {
    priceRows.remove(index);
    // A "same time as another row" error may now be gone.
    void form.trigger("prices");
  }

  return (
    <PricingSection
      help="Leave the date and time empty to start when the course is published."
      onAddPrice={() => priceRows.append(emptyPriceRow)}
      summary={summary}
    >
      {priceRows.fields.map((row, index) => (
        <PriceRow
          key={row.id}
          form={form}
          names={priceRowNames(index)}
          index={index}
          rowCount={priceRows.fields.length}
          showRemove={priceRows.fields.length > 1}
          onRemove={() => removePriceRow(index)}
        />
      ))}
    </PricingSection>
  );
}
