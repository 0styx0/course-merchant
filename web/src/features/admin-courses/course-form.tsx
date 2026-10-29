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
  courseFormSchema,
  type CheckedCourseFormValues,
  type CourseFormValues,
} from "./course-form-schema";
import { createCourseAction } from "./create-course.action";
import { DescriptionEditor } from "./description-editor";
import { scheduleLength } from "./format-course-length";
import { PriceRow } from "./price-row";

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

  const { errors, isSubmitted, isSubmitting, submitCount } = form.formState;
  const problems = isSubmitted
    ? courseFormProblems(errors, priceRows.fields.length)
    : [];
  const length = scheduleLength(
    useWatch({ control: form.control, name: "schedule" }),
  );

  // After each submit attempt, read out every problem.
  useEffect(() => {
    summaryRef.current?.focus();
  }, [submitCount]);

  function recheckEnd() {
    return form.trigger(["schedule.endDate", "schedule.endTimeOfDay"]);
  }

  async function save(values: CheckedCourseFormValues) {
    setServerProblem(undefined);
    const result = await createCourseAction(values);
    if (result.state === "success") {
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
        {length && <p className="self-end text-sm">Lasts {length}</p>}
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
