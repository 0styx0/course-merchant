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
  ) { }

  private publicCourseDetails(now: Temporal.Instant) {
    return this.prisma.db.orm.public.Course
      .where((course) => course.archivedAt.isNull())
      .where((course) =>
        course.prices.some((price) => price.effectiveAt.lte(now)),
      )
      .include("prices", (prices) =>
        prices
          .where((price) => price.effectiveAt.lte(now))
          .orderBy((price) => price.effectiveAt.desc())
          .limit(1),
      )
      .include("enrollments", (enrollments) => enrollments.count());
  }

  async findAvailable(now: Temporal.Instant): Promise<CourseRepositoryModel[]> {
    return await this.publicCourseDetails(now)
      .where((course) => course.endsAt.gt(now))
      .orderBy([
        (course) => course.startsAt.asc(),
        (course) => course.id.asc(),
      ])
      .all();
  }

  findById(
    courseId: string,
    now: Temporal.Instant,
  ): Promise<CourseRepositoryModel | null> {
    return this.publicCourseDetails(now)
      .where((course) => course.id.eq(courseId))
      .first();
  }
}