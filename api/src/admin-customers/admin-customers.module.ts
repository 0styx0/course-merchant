import { Module } from "@nestjs/common";

import { AdminCustomersRepository } from "./admin-customers.repository.js";

@Module({
  providers: [AdminCustomersRepository],
  exports: [AdminCustomersRepository],
})
export class AdminCustomersModule {}
