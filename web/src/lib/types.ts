import { components } from "./api/generated";

export type Result<T, E> =
  | {
      state: "success";
      data: T;
    }
  | {
      state: "failure";
      error: E;
    };

export type Course = components["schemas"]["Course"];
export type ProblemDetails = components["schemas"]["ProblemDetails"];
