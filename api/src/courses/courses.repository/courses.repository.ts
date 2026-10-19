import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Temporal } from "@js-temporal/polyfill";
import { Models } from "@/prisma/contract.js";
import { and } from "@prisma/orm-postgres/orm-client";

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

export type CourseRepositoryModelAdmin = {
  id: string;
  title: string;
  description: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
  prices: {
    id: string;
    amount: number;
    currency: string;
    effectiveAt: Temporal.Instant;
  }[];
  statuses: {
    name: Models.public_CourseStatus["name"];
    changedAt: Temporal.Instant;
  }[];
  enrollments: {
    customer: {
      id: string;
      name: string;
      email: string;
    };
    payment: {
      status: Models.public_Payment["status"];
      amount: number;
      paidAt: Models.public_Payment["paidAt"];
    };
  }[];
};

@Injectable()
export class CoursesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) { }

  private publicCourseDetails(now: Temporal.Instant) {
    return this.prisma.db.orm.public.Course
      .where((course) =>
        course.statuses.some((status) =>
          and(
            status.name.eq("published"),
            status.course.some((sameCourse) =>
              sameCourse.statuses.none((laterStatus) =>
                laterStatus.changedAt.gt(status.changedAt),
              ),
            ),
          ),
        ),
      )
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

  /**
   * the most recently changed status is returned 
   */
  async findCourseDetailsByIdAdmin(courseId: string): Promise<CourseRepositoryModelAdmin | null> {

    return await this.prisma.db.orm.public.Course
      .include("prices", (prices) =>
        prices.orderBy((price) => price.effectiveAt.asc()),
      )
      .include("statuses", (statuses) =>
        statuses
          .select("name", "changedAt")
          .orderBy((status) => status.changedAt.desc())
          .limit(1),
      )
      .include("enrollments", (enrollments) =>
        enrollments
          .include("customer")
          .include("payment")
      )
      .where((course) => course.id.eq(courseId))
      .first();
  }

  async findAllCourseDetailsAdmin(): Promise<CourseRepositoryModelAdmin[]> {
    return await this.prisma.db.orm.public.Course
    .where((course) =>
      course.statuses.some((status) =>
        and(
          status.name.neq("deleted"),
          status.course.some((sameCourse) =>
            sameCourse.statuses.none((laterStatus) =>
              laterStatus.changedAt.gt(status.changedAt),
            ),
          ),
        ),
      ),
    )
      .include("prices", (prices) =>
        prices.orderBy((price) => price.effectiveAt.asc()),
      )
      .include("statuses", (statuses) =>
        statuses
          .select("name", "changedAt")
          .orderBy((status) => status.changedAt.desc())
          .limit(1),
      )
      .include("enrollments", (enrollments) =>
        enrollments.include("customer").include("payment"),
      )
      .orderBy((course) => course.startsAt.desc())
      .all();
  }
}