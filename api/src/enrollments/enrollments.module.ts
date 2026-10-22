import { Module } from "@nestjs/common";

import { EnrollmentsRepository } from "./enrollments.repository.js";

@Module({
  providers: [EnrollmentsRepository],
  exports: [EnrollmentsRepository],
})
export class EnrollmentsModule {}
