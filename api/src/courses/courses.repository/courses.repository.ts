import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";


@Injectable()
export class CoursesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  findAvailable(now: Date) {
    return this.prisma.db.orm.public.Course
      .where((course) => course.endsAt.gt(now))
      .where((course) => course.archivedAt.isNull())
      .where((course) =>
        course.prices.some((price) => price.effectiveAt.lte(now)),
      )
      .orderBy([
        (course) => course.startsAt.asc(),
        (course) => course.id.asc(),
      ])
      .include("prices", (prices) =>
        prices
          .where((price) => price.effectiveAt.lte(now))
          .orderBy((price) => price.effectiveAt.desc())
          .limit(1),
      )
      .include("enrollments", (enrollments) => enrollments.count())
      .all();
  }
}