"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";
import { Button } from "@/components/ui/button";

import {
  useBrowserTimeZone,
  useFocusSummaryOnSubmit,
  useLeaveWarning,
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
import { createCourseAction } from "./create-course.action";
import { priceSummary, scheduleSummary } from "./format-course-length";

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

type CourseFormProps = {
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "create course" form. It saves a draft and goes to the home page. */
export function CourseForm({ timeZones }: CourseFormProps) {
  const router = useRouter();
  const form = useForm<CourseFormValues, unknown, CheckedCourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: false,
  });
  const priceRows = useFieldArray({ control: form.control, name: "prices" });
  const [serverProblem, setServerProblem] = useState<{
    title: string;
    detail: string;
  }>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);

  const { errors, isDirty, isSubmitted, isSubmitting, submitCount } =
    form.formState;
  const problems = isSubmitted
    ? courseFormProblems(errors, priceRows.fields.length)
    : [];
  const schedule = useWatch({ control: form.control, name: "schedule" });
  const scheduleText = scheduleSummary(schedule);
  const prices = priceSummary(
    useWatch({ control: form.control, name: "prices" }),
    schedule.timeZone,
  );

  useFocusSummaryOnSubmit(summaryRef, submitCount);
  useBrowserTimeZone(form.reset, timeZones, defaultValues);
  useLeaveWarning(isDirty && !saved);

  async function save(values: CheckedCourseFormValues) {
    setServerProblem(undefined);
    const result = await createCourseAction(values);
    if (result.state === "success") {
      setSaved(true);
      router.push("/");
      return;
    }
    const { problem, fieldErrors } = result.error;
    setServerProblem({ title: problem.title, detail: problem.detail });
    for (const { path, message } of fieldErrors) {
      form.setError(path as Path<CourseFormValues>, { message });
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save, () => setServerProblem(undefined))}
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
