import "server-only";

import type { AdminCustomer, ProblemDetails, Result } from "@/lib/types";
import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";

export async function listCustomersAsAdmin(): Promise<
  Result<{ customers: AdminCustomer[] }, ProblemDetails>
> {
  return toResult(await api.GET("/admin/customers"));
}
