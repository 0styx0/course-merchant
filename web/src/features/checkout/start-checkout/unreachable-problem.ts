import type { ProblemDetails } from "@/lib/types";

// The web app makes up this problem; the API never sends this code.
export const UNREACHABLE_PROBLEM: ProblemDetails = {
  title: "Can't reach the server",
  detail: "Your details are still here. Try again in a moment.",
  code: "API_UNREACHABLE",
};
