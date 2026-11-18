import { Controller, Get, Inject } from "@nestjs/common";

import type { ListAdminCustomersResponse } from "types.js";
import { AdminCustomersService } from "./admin-customers.service.js";

@Controller({
  path: "admin/customers",
  version: "1",
})
export class AdminCustomersController {
  constructor(
    @Inject(AdminCustomersService)
    private readonly adminCustomersService: AdminCustomersService,
  ) {}

  @Get()
  listCustomers(): Promise<ListAdminCustomersResponse> {
    return this.adminCustomersService.listCustomers();
  }
}
