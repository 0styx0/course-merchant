"use client";

import { useState } from "react";
import { useWatch, type UseFieldArrayReturn } from "react-hook-form";

import {
  courseFieldLabels,
  priceRowNames,
} from "../course-form/fields/course-field-labels-and-price-row-names";
import {
  DescriptionField,
  InputField,
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/fields/course-form-fields";
import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  BasicsSection,
  PricingSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import { ImageInput } from "../course-form/fields/image-input";
import type { ChosenImage } from "../image/course-image";
import { adminCourseImagePath } from "../image/course-image-route";
import { ImagePreview } from "../image/image-preview";
import { PriceRow } from "../price/price-row";
import { PricesInEffect } from "../price/prices-in-effect";
import { priceSummary } from "../price/price-summary";
import { scheduleSummary } from "../schedule/summary/schedule-summary";
import { isKnownTimeZone } from "../validation/course-form-schema";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type {
  EditCourseFormValues,
  LoadedPrice,
} from "../validation/edit-course-form-schema";

type EditForm = CourseFormApi<EditCourseFormValues>;

/** The course's stored image, loaded through the web app, with a message if it fails. */
function StoredImagePreview({ courseId }: { courseId: string }) {
  const [loadFailed, setLoadFailed] = useState(false);
  if (loadFailed) return <p>The stored image couldn&apos;t be loaded.</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- an admin-only image behind the login cookie, not optimizable
    <img
      src={adminCourseImagePath(courseId)}
      alt="Current course image"
      onError={() => setLoadFailed(true)}
      className="aspect-video w-full rounded-lg border object-cover object-center"
    />
  );
}

type EditBasicsSectionProps = {
  form: EditForm;
  courseId: string;
  hasStoredImage: boolean;
  isSubmitted: boolean;
};

/** Edit's basics: the image, name, summary and description. */
export function EditBasicsSection({
  form,
  courseId,
  hasStoredImage,
  isSubmitted,
}: EditBasicsSectionProps) {
  // A readable chosen file wins; otherwise the stored image, or the reason one is needed.
  function renderImagePreview(image: ChosenImage | null) {
    if (image && image.width > 0) return <ImagePreview file={image.file} />;
    if (hasStoredImage) return <StoredImagePreview courseId={courseId} />;
    return <p>No image yet. A course needs one before it can be published.</p>;
  }

  return (
    <BasicsSection>
      <ImageInput
        form={form}
        name="image"
        isSubmitted={isSubmitted}
        renderPreview={renderImagePreview}
      />
      <InputField
        form={form}
        name="name"
        label={courseFieldLabels.name}
        limit={COURSE_NAME_MAX_LENGTH}
      />
      <InputField
        form={form}
        name="summary"
        label={courseFieldLabels.summary}
        limit={COURSE_SUMMARY_MAX_LENGTH}
      />
      <DescriptionField form={form} name="description" />
    </BasicsSection>
  );
}

const scheduleNames: ScheduleDateTimeNames<EditCourseFormValues> = {
  startDate: "schedule.startDate",
  startTimeOfDay: "schedule.startTimeOfDay",
  endDate: "schedule.endDate",
  endTimeOfDay: "schedule.endTimeOfDay",
};

/** Edit's schedule: the zone, the four boxes, and the sentence for them. */
export function EditScheduleSection({
  form,
  timeZones,
}: {
  form: EditForm;
  timeZones: string[];
}) {
  const schedule = useWatch({ control: form.control, name: "schedule" });

  return (
    <ScheduleSection scheduleText={scheduleSummary(schedule)}>
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

/** What an added price row looks like before anything is typed in it. */
const emptyEditPrice = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

/**
 * The zone the prices are shown in, and the price summary, kept in step with
 * the boxes. A stored zone the list lacks shows in UTC, as the boxes do.
 */
function useZoneAndPriceSummary(form: EditForm) {
  const chosenZone = useWatch({
    control: form.control,
    name: "schedule.timeZone",
  });
  const timeZone = isKnownTimeZone(chosenZone) ? chosenZone : "UTC";
  const prices = useWatch({ control: form.control, name: "prices" });
  const summary = priceSummary(prices, {
    timeZone,
    textForEmptyStart: "when you save",
  });
  return { timeZone, summary };
}

type EditPricingSectionProps = {
  form: EditForm;
  priceRows: UseFieldArrayReturn<EditCourseFormValues, "prices">;
  pricesInEffect: LoadedPrice[];
};

/** Edit's pricing: the read-only prices in effect, then one row per future price. */
export function EditPricingSection({
  form,
  priceRows,
  pricesInEffect,
}: EditPricingSectionProps) {
  const { timeZone, summary } = useZoneAndPriceSummary(form);
  function removePriceRow(index: number) {
    priceRows.remove(index);
    // A "same time as another row" error may now be gone.
    void form.trigger("prices");
  }
  // A price in effect keeps the course priced, so even the only row may go.
  const minimumRows = pricesInEffect.length > 0 ? 0 : 1;

  return (
    <PricingSection
      help="Leave the date and time empty to start when you save."
      onAddPrice={() => priceRows.append(emptyEditPrice)}
      summary={summary}
    >
      <PricesInEffect prices={pricesInEffect} timeZone={timeZone} />
      {priceRows.fields.map((row, index) => (
        <PriceRow
          key={row.id}
          form={form}
          names={priceRowNames(index)}
          index={index}
          rowCount={priceRows.fields.length}
          showRemove={priceRows.fields.length > minimumRows}
          onRemove={() => removePriceRow(index)}
        />
      ))}
    </PricingSection>
  );
}
