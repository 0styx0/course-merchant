import { Injectable, Inject } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import { Models } from "@/prisma/contract.js";
import { PrismaService } from "@/prisma/prisma.service.js";

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

export type CourseRepositoryCreateInput = {
  title: string;
  description: string;
  contentUrl: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
  initialStatus: Models.public_CourseStatus["name"];
  prices: {
    amount: number;
    currency: string;
    effectiveAt: Temporal.Instant;
  }[];
};

type CourseDelegate =
  PrismaService["db"]["orm"]["public"]["Course"];

@Injectable()
export class AdminCoursesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Builds the shared query for admin course details.
   * Includes all prices, the latest status, and enrollment details.
   */
  private adminCourseDetailsQuery(course: CourseDelegate) {
    return course
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
          .include("payment"),
      );
  }

  /**
   * Returns the admin course details, including only the latest status.
   */
  findCourseDetailsByIdAdmin(
    courseId: string,
  ): Promise<CourseRepositoryModelAdmin | null> {
    return this.adminCourseDetailsQuery(
      this.prisma.db.orm.public.Course,
    )
      .where((course) => course.id.eq(courseId))
      .first();
  }

  async findAllCourseDetailsAdmin(): Promise<CourseRepositoryModelAdmin[]> {
    return await this.adminCourseDetailsQuery(
      this.prisma.db.orm.public.Course,
    )
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
      .orderBy((course) => course.startsAt.desc())
      .all();
  }

  async createCourse(
    input: CourseRepositoryCreateInput,
  ): Promise<CourseRepositoryModelAdmin> {
    return this.prisma.db.transaction(async (tx) => {
      const course = await tx.orm.public.Course.create({
        title: input.title,
        description: input.description,
        contentUrl: input.contentUrl,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timeZone: input.timeZone,

        statuses: (statuses) =>
          statuses.create({
            name: input.initialStatus,
          }),

        prices: (prices) =>
          prices.create(
            input.prices.map((price) => ({
              amount: price.amount,
              currency: price.currency,
              effectiveAt: price.effectiveAt,
            })),
          ),
      });

      const createdCourse = await this.adminCourseDetailsQuery(
        tx.orm.public.Course,
      )
        .where((candidate) => candidate.id.eq(course.id))
        .first();

      if (!createdCourse) {
        // throwing prevents transaction commit
        throw new Error(
          `Created course ${course.title} (${course.id}) could not be loaded.`,
        );
      }

      return createdCourse;
    });
  }
}