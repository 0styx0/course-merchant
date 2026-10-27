import type { ProblemDetails } from "@/lib/types";
import { HttpResponse } from "msw";

export function problemResponse(status: number, body: ProblemDetails) {
  return HttpResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}
