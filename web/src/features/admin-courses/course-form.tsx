"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type Path,
} from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";
import { Button } from "@/components/ui/button";

import {
  useBrowserTimeZone,
  useFocusSummaryOnSubmit,
  useLeaveWarning,
  useSaveCourse,
} from "./course-form-hooks";
import { courseFormProblems } from "./course-form-problems";
import {
  BasicsSection,
  ContentSection,
  emptyPrice,
  PricingSection,
  ScheduleSection,
} from "./course-form-sections";
import {
  courseFormSchema,
  type CheckedCourseFormValues,
  type CourseFormValues,
} from "./course-form-schema";
import { priceSummary } from "./price-summary";
import { scheduleSummary } from "./schedule-summary";

/** Used until the browser's own zone is known, and when the list lacks it. */
const DEFAULT_TIME_ZONE = "America/New_York";

const defaultValues: CourseFormValues = {
  name: "",
  summary: "",
  description: { type: "doc", content: [] },
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
  const form = useForm<CourseFormValues, unknown, CheckedCourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: false,
  });
  const priceRows = useFieldArray({ control: form.control, name: "prices" });
  return { form, priceRows };
}

/** The schedule's and the price list's summary lines, kept in step with the inputs. */
function useScheduleAndPriceText(
  control: Control<CourseFormValues, unknown, CheckedCourseFormValues>,
) {
  const schedule = useWatch({ control, name: "schedule" });
  const prices = priceSummary(
    useWatch({ control, name: "prices" }),
    schedule.timeZone,
  );
  return { scheduleText: scheduleSummary(schedule), prices };
}

type CourseFormProps = {
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "create course" form. It saves a draft and goes to the home page. */
export function CourseForm({ timeZones }: CourseFormProps) {
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
        onSelectField={(name) => form.setFocus(name as Path<CourseFormValues>)}
      />

      <BasicsSection form={form} isSubmitted={isSubmitted} />
      <ContentSection form={form} />
      <ScheduleSection
        form={form}
        timeZones={timeZones}
        scheduleText={scheduleText}
      />
      <PricingSection form={form} priceRows={priceRows} summary={prices} />

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save as draft"}
      </Button>
    </form>
  );
}
