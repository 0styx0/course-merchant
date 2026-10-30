"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type Path,
  type UseFormReturn,
} from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";
import { Button } from "@/components/ui/button";

import { useFocusSummaryOnSubmit } from "../course-form/hooks/use-focus-summary-on-submit";
import { useLeaveWarning } from "../course-form/hooks/use-leave-warning";
import { courseFormProblems } from "../course-form/problems/course-form-problems";
import {
  BasicsSection,
  CourseMaterialSection,
  emptyPrice,
  PricingSection,
} from "../course-form/sections/course-form-sections";
import { CreateScheduleSection } from "./create-course-sections";
import { useBrowserTimeZone } from "./use-browser-time-zone";
import { useSaveCourse } from "./use-save-course";
import {
  courseFormWithImageSchema,
  type CheckedCourseFormWithImageValues,
  type CourseFormWithImageValues,
} from "../validation/course-form-schema";
import { priceSummary } from "../price/price-summary";
import { scheduleSummary } from "../schedule/summary/schedule-summary";

/** Used until the browser's own zone is known, and when the list lacks it. */
const DEFAULT_TIME_ZONE = "America/New_York";

const defaultValues: CourseFormWithImageValues = {
  name: "",
  summary: "",
  description: { type: "doc", content: [] },
  image: null,
  contentUrl: "",
  schedule: {
    startDate: "",
    startTimeOfDay: "",
    endDate: "",
    endTimeOfDay: "",
    timeZone: DEFAULT_TIME_ZONE,
  },
  prices: [emptyPrice],
};

function useCourseFormState() {
  const form = useForm<
    CourseFormWithImageValues,
    unknown,
    CheckedCourseFormWithImageValues
  >({
    resolver: zodResolver(courseFormWithImageSchema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: false,
  });
  const priceRows = useFieldArray({ control: form.control, name: "prices" });
  return { form, priceRows };
}

/** The error list names fields with plain strings; every one is a form field. */
function focusField(
  form: UseFormReturn<
    CourseFormWithImageValues,
    unknown,
    CheckedCourseFormWithImageValues
  >,
  name: string,
) {
  form.setFocus(name as Path<CourseFormWithImageValues>);
}

/** The schedule's and the price list's summary lines, kept in step with the inputs. */
function useScheduleAndPriceText(
  control: Control<
    CourseFormWithImageValues,
    unknown,
    CheckedCourseFormWithImageValues
  >,
) {
  const schedule = useWatch({ control, name: "schedule" });
  const prices = priceSummary(
    useWatch({ control, name: "prices" }),
    schedule.timeZone,
  );
  return { scheduleText: scheduleSummary(schedule), prices };
}

function SaveButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting} className="self-start">
      {isSubmitting ? "Saving…" : "Save as draft"}
    </Button>
  );
}

type CreateCourseFormProps = {
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "create course" form. It saves a draft and goes to the home page. */
export function CreateCourseForm({ timeZones }: CreateCourseFormProps) {
  const { form, priceRows } = useCourseFormState();
  const summaryRef = useRef<HTMLDivElement>(null);
  const { save, saved, serverProblem, clearServerProblem } =
    useSaveCourse(form);
  const { errors, isDirty, isSubmitted, isSubmitting, submitCount } =
    form.formState;
  const problems = isSubmitted
    ? courseFormProblems(errors, priceRows.fields.length)
    : [];
  const { scheduleText, prices } = useScheduleAndPriceText(form.control);

  useFocusSummaryOnSubmit(summaryRef, submitCount);
  useBrowserTimeZone(form.reset, timeZones, defaultValues);
  useLeaveWarning(isDirty && !saved);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save, clearServerProblem)}
      className="flex flex-col gap-8"
    >
      <ErrorSummary
        ref={summaryRef}
        problems={problems}
        serverProblem={serverProblem}
        onSelectField={(name) => focusField(form, name)}
      />

      <BasicsSection form={form} isSubmitted={isSubmitted} />
      <CourseMaterialSection form={form} />
      <CreateScheduleSection
        form={form}
        timeZones={timeZones}
        scheduleText={scheduleText}
      />
      <PricingSection form={form} priceRows={priceRows} summary={prices} />

      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}
