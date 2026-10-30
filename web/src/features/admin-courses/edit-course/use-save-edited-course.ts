import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  refusalMessage,
  useServerProblem,
} from "../course-form/hooks/use-server-problem";
import { updateCourseDetailsAction } from "../save-course/edit/update-course-details.action";
import type { EditCourseFormValues } from "../validation/edit-course-form-schema";
import type { KeptParts } from "./edit-course-start";

type EditCourseFormApi = UseFormReturn<
  EditCourseFormValues,
  unknown,
  EditCourseFormValues
>;

/**
 * Saves the edited details with the kept parts as loaded. A refusal leaves a
 * message and puts its field errors on the fields; a save goes to the home page.
 */
export function useSaveEditedCourse(
  form: EditCourseFormApi,
  courseId: string,
  keptParts: KeptParts,
) {
  const router = useRouter();
  const { serverProblem, showRefusal, showThrownProblem, clearServerProblem } =
    useServerProblem(form.setError);
  const [saved, setSaved] = useState(false);

  async function save(values: EditCourseFormValues) {
    clearServerProblem();
    try {
      const result = await updateCourseDetailsAction(
        courseId,
        values,
        keptParts,
      );
      if (result.state === "failure") {
        return showRefusal(refusalMessage(result.error), result.error);
      }
      setSaved(true);
      router.push("/");
    } catch {
      // A rejected Server Action throws instead of returning a failure.
      showThrownProblem();
    }
  }

  return { save, saved, serverProblem, clearServerProblem };
}
