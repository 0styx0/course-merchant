import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Temporal } from "@js-temporal/polyfill";
import { visibleCoursesWithCurrentPrice } from "../course-visibility.js";

export type CourseRepositoryModelPublic = {
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
    return visibleCoursesWithCurrentPrice(this.prisma.db.orm.public.Course, now)
      .include("enrollments", (enrollments) => enrollments.count());
  }

  async findAvailable(now: Temporal.Instant): Promise<CourseRepositoryModelPublic[]> {
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
  ): Promise<CourseRepositoryModelPublic | null> {
    return this.publicCourseDetails(now)
      .where((course) => course.id.eq(courseId))
      .first();
  }
}