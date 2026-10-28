"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";
import { Button } from "@/components/ui/button";

import { InputField, SelectField } from "./course-form-fields";
import { courseFormProblems } from "./course-form-problems";
import {
  courseFormSchema,
  type CheckedCourseFormValues,
  type CourseFormValues,
} from "./course-form-schema";
import { createCourseAction } from "./create-course.action";
import { DescriptionEditor } from "./description-editor";
import { scheduleLength } from "./format-course-length";

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
  prices: [{ amountDollars: "", effectiveDate: "", effectiveTimeOfDay: "" }],
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
  const [serverProblem, setServerProblem] = useState<{
    title: string;
    detail: string;
  }>();
  const summaryRef = useRef<HTMLDivElement>(null);

  const { errors, isSubmitted, isSubmitting, submitCount } = form.formState;
  const problems = isSubmitted ? courseFormProblems(errors) : [];
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
      className="flex flex-col gap-6"
    >
      <ErrorSummary
        ref={summaryRef}
        problems={problems}
        serverProblem={serverProblem}
        onSelectField={(name) => form.setFocus(name as Path<CourseFormValues>)}
      />

      <InputField form={form} name="name" label="Course name" />
      <InputField form={form} name="summary" label="Summary" />
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
      <InputField
        form={form}
        name="contentUrl"
        label="Content link"
        type="url"
        description="Where students find the course material. It is never shown to the public."
      />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Schedule</legend>
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
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-medium">Price (USD)</legend>
        <InputField form={form} name="prices.0.amountDollars" label="Price" />
        <InputField
          form={form}
          name="prices.0.effectiveDate"
          label="Price start date"
          type="date"
          description="Leave the date and time empty to start when the course is saved."
        />
        <InputField
          form={form}
          name="prices.0.effectiveTimeOfDay"
          label="Price start time"
          type="time"
        />
      </fieldset>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save course"}
      </Button>
    </form>
  );
}
