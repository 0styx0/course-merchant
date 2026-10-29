"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Path,
} from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";
import { FormSection } from "@/components/form/form-section";
import { Button } from "@/components/ui/button";

import { InputField, SelectField } from "./course-form-fields";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "./course-form-limits";
import { courseFormProblems } from "./course-form-problems";
import {
  browserTimeZone,
  courseFormSchema,
  type CheckedCourseFormValues,
  type CourseFormValues,
} from "./course-form-schema";
import { createCourseAction } from "./create-course.action";
import { DescriptionEditor } from "./description-editor";
import { scheduleSummary } from "./format-course-length";
import { PriceRow } from "./price-row";

/** Used until the browser's own zone is known, and when the list lacks it. */
const DEFAULT_TIME_ZONE = "America/New_York";

const emptyPrice = {
  amountDollars: "",
  effectiveDate: "",
  effectiveTimeOfDay: "",
};

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
  const scheduleText = scheduleSummary(
    useWatch({ control: form.control, name: "schedule" }),
  );

  // After each submit attempt, read out every problem.
  useEffect(() => {
    summaryRef.current?.focus();
  }, [submitCount]);

  // The browser's zone can't be read on the server, so it's set after the
  // first render. Resetting (not setting) keeps the form clean.
  const { reset } = form;
  useEffect(() => {
    const timeZone = browserTimeZone();
    if (!timeZones.includes(timeZone)) return;
    reset({
      ...defaultValues,
      schedule: { ...defaultValues.schedule, timeZone },
    });
  }, [reset, timeZones]);

  // Ask the browser to confirm before reloading or closing with unsaved work.
  useEffect(() => {
    if (!isDirty || saved) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, saved]);

  function recheckEnd() {
    return form.trigger(["schedule.endDate", "schedule.endTimeOfDay"]);
  }

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
      </FormSection>

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

      <FormSection
        title="Schedule"
        description="When the course runs."
        className="grid gap-4 sm:grid-cols-2"
      >
        <InputField
          form={form}
          name="schedule.startDate"
          label="Start date"
          type="date"
          registerOptions={{ onChange: () => recheckEnd() }}
        />
        <InputField
          form={form}
          name="schedule.startTimeOfDay"
          label="Start time"
          type="time"
          registerOptions={{ onChange: () => recheckEnd() }}
        />
        <InputField
          form={form}
          name="schedule.endDate"
          label="End date"
          type="date"
        />
        <InputField
          form={form}
          name="schedule.endTimeOfDay"
          label="End time"
          type="time"
        />
        <SelectField
          form={form}
          name="schedule.timeZone"
          label="Time zone"
          registerOptions={{
            onChange: () => form.trigger(["schedule", "prices"]),
          }}
        >
          {timeZones.map((timeZone) => (
            <option key={timeZone} value={timeZone}>
              {timeZone}
            </option>
          ))}
        </SelectField>
        <p aria-live="polite" className="text-sm sm:col-span-2">
          {scheduleText}
        </p>
      </FormSection>

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
            onRemove={() => {
              priceRows.remove(index);
              // A "same time as another row" error may now be gone.
              void form.trigger("prices");
            }}
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
      </FormSection>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save as draft"}
      </Button>
    </form>
  );
}
