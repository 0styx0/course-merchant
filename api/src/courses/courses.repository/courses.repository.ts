import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Temporal } from "@js-temporal/polyfill";

export type CourseRepositoryModel = {
  id: string;
  title: string;
  description: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
  prices: {
    amount: number;
    currency: string;
  }[];
  enrollments: number;
};

@Injectable()
export class CoursesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  findAvailable(now: Temporal.Instant): AsyncIterable<CourseRepositoryModel | null> {
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

  findById(courseId: string, now: Temporal.Instant): Promise<CourseRepositoryModel | null> {
    return this.prisma.db.orm.public.Course
      // Match the requested course.
      .where((course) => course.id.eq(courseId))
  
      // Archived courses are never publicly visible.
      .where((course) => course.archivedAt.isNull())
  
      // A course must have an effective price to be returned.
      .where((course) =>
        course.prices.some((price) => price.effectiveAt.lte(now)),
      )
  
      .include("prices", (prices) =>
        prices
          .where((price) => price.effectiveAt.lte(now))
          .orderBy((price) => price.effectiveAt.desc())
          .limit(1),
      )
  
      .include("enrollments", (enrollments) => enrollments.count())
      .first();
  }
}