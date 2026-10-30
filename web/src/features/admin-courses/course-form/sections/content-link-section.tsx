"use client";

import type { FieldPathByValue, FieldValues } from "react-hook-form";

import { courseFieldLabels } from "../fields/course-field-labels-and-price-row-names";
import { InputField, type CourseFormApi } from "./course-form-fields";
import { CourseMaterialSection } from "./course-form-sections";

/** The course material frame with the content link box in it. */
export function ContentLinkSection<T extends FieldValues>({
  form,
  name,
}: {
  form: CourseFormApi<T>;
  /** The path of the content link, which must hold a string. */
  name: FieldPathByValue<T, string>;
}) {
  return (
    <CourseMaterialSection>
      <InputField
        form={form}
        name={name}
        label={courseFieldLabels.contentUrl}
        type="url"
        description="Where students find the course material. It is never shown to the public."
      />
    </CourseMaterialSection>
  );
}
