"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";

import { useErrorListAndLeaveWarning } from "../course-form/hooks/use-error-list-and-leave-warning";
import { ContentLinkSection } from "../course-form/sections/content-link-section";
import { SaveButton } from "../course-form/sections/save-button";
import { createCourseFields } from "./create-course-fields";
import {
  CreateBasicsSection,
  CreatePricingSection,
  CreateScheduleSection,
  emptyPrice,
} from "./create-course-sections";
import { useBrowserTimeZone } from "./use-browser-time-zone";
import { useSaveNewCourse } from "./use-save-new-course";
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

type CreateCourseFormProps = {
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "create course" form. It saves a draft and goes to the home page. */
export function CreateCourseForm({ timeZones }: CreateCourseFormProps) {
  const { form, priceRows } = useCourseFormState();
  const { save, saved, serverProblem, clearServerProblem } =
    useSaveNewCourse(form);
  const { isSubmitted, isSubmitting } = form.formState;
  const errorList = useErrorListAndLeaveWarning(
    form,
    createCourseFields(priceRows.fields.length),
    saved,
  );
  const { scheduleText, prices } = useScheduleAndPriceText(form.control);

  useBrowserTimeZone(form.reset, timeZones, defaultValues);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save, clearServerProblem)}
      className="flex flex-col gap-8"
    >
      <ErrorSummary {...errorList} serverProblem={serverProblem} />

      <CreateBasicsSection form={form} isSubmitted={isSubmitted} />
      <ContentLinkSection form={form} name="contentUrl" />
      <CreateScheduleSection
        form={form}
        timeZones={timeZones}
        scheduleText={scheduleText}
      />
      <CreatePricingSection
        form={form}
        priceRows={priceRows}
        summary={prices}
      />

      <SaveButton label="Save as draft" isSubmitting={isSubmitting} />
    </form>
  );
}
