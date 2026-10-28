import { components } from "src/generated/api.js";
import type { PrismaService } from "src/prisma/prisma.service.js";

/**
 * Where a repository method runs its queries: `prisma.db`, or the `tx` of an
 * open transaction so several repositories can write atomically.
 */
export type DbScope = Pick<PrismaService["db"], "orm">;

export type CourseResponse = components["schemas"]["Course"];

export type ListCoursesResponse = components["schemas"]["ListCoursesResponse"];

export type GetCourseResponse = components["schemas"]["Course"];

export type GetCourseAdminResponse = components["schemas"]["AdminCourse"];
export type ListCoursesAdminResponse =
  components["schemas"]["ListAdminCoursesResponse"];

export type CourseDescription = components["schemas"]["CourseDescription"];

export type CreateCourseRequest = components["schemas"]["CreateCourseRequest"];
export type UpdateCourseRequest = components["schemas"]["UpdateCourseRequest"];

export type StartCheckoutRequest =
  components["schemas"]["StartCheckoutRequest"];
export type StartCheckoutResponse =
  components["schemas"]["StartCheckoutResponse"];
export type CheckoutStatusResponse = components["schemas"]["CheckoutStatus"];

export type CreateAdminSessionRequest =
  components["schemas"]["CreateAdminSessionRequest"];
export type AdminSessionResponse = components["schemas"]["AdminSession"];

export type ProblemDetails = components["schemas"]["ProblemDetails"];

export type ValidationProblemDetails =
  components["schemas"]["ValidationProblemDetails"];

export type FieldError = components["schemas"]["FieldError"];
