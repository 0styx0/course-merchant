import { Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

export type CourseRepositoryModelAdmin = {
  id: string;
  title: string;
  description: string;
  contentUrl: string;
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
    revokedAt: Temporal.Instant | null;
    suspendedAt: Temporal.Instant | null;
    customer: {
      id: string;
      name: string;
      email: string;
    };
    // only the newest email, so empty when none was queued. The ORM types a
    // nested to-one include as nullable, although the link always has its email
    emails: {
      email: { status: Models.public_EmailOutbox["status"] } | null;
    }[];
    // null for free courses
    payment: {
      status: Models.public_Payment["status"];
      amount: number;
      paidAt: Models.public_Payment["paidAt"];
    } | null;
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

export type CourseRepositoryUpdateInput = {
  title: string;
  description: string;
  contentUrl: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
  // only set when the status changed, so the log records real transitions
  nextStatus: Models.public_CourseStatus["name"] | null;
  newPrices: {
    amount: number;
    currency: string;
    effectiveAt: Temporal.Instant;
  }[];
  deletePriceIds: string[];
  // prices in effect at this instant are never deleted
  now: Temporal.Instant;
};

type CourseDelegate = DbScope["orm"]["public"]["Course"];

@Injectable()
export class AdminCoursesRepository {
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
          .include("payment")
          .include("emails", (links) =>
            links
              .include("email", (email) => email.select("status"))
              .orderBy((link) => link.email.createdAt.desc())
              .limit(1),
          ),
      );
  }

  /**
   * Returns the admin course details, including only the latest status.
   */
  findCourseDetailsByIdAdmin(
    scope: DbScope,
    courseId: string,
  ): Promise<CourseRepositoryModelAdmin | null> {
    return this.adminCourseDetailsQuery(scope.orm.public.Course)
      .where((course) => course.id.eq(courseId))
      .first();
  }

  async findAllCourseDetailsAdmin(
    scope: DbScope,
  ): Promise<CourseRepositoryModelAdmin[]> {
    return await this.adminCourseDetailsQuery(scope.orm.public.Course)
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
    scope: DbScope,
    input: CourseRepositoryCreateInput,
  ): Promise<CourseRepositoryModelAdmin> {
    const course = await scope.orm.public.Course.create({
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
      scope.orm.public.Course,
    )
      .where((candidate) => candidate.id.eq(course.id))
      .first();

    if (!createdCourse) {
      // throwing rolls back the caller's transaction
      throw new Error(
        `Created course ${course.title} (${course.id}) could not be loaded.`,
      );
    }

    return createdCourse;
  }

  /**
   * Overwrites the course details, replaces future prices and appends the
   * status. Returns null when the course does not exist.
   */
  async updateCourse(
    scope: DbScope,
    courseId: string,
    input: CourseRepositoryUpdateInput,
  ): Promise<CourseRepositoryModelAdmin | null> {
    const course = await scope.orm.public.Course.where((candidate) =>
      candidate.id.eq(courseId),
    ).update({
      title: input.title,
      description: input.description,
      contentUrl: input.contentUrl,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timeZone: input.timeZone,
    });

    if (!course) {
      return null;
    }

    // delete before inserting, so a replaced price can reuse its effectiveAt
    if (input.deletePriceIds.length > 0) {
      await scope.orm.public.CoursePrice.where((price) =>
        and(
          price.courseId.eq(courseId),
          price.id.in(input.deletePriceIds),
          price.effectiveAt.gt(input.now),
        ),
      ).deleteAndCount();
    }

    if (input.newPrices.length > 0) {
      await scope.orm.public.CoursePrice.createAndCount(
        input.newPrices.map((price) => ({
          courseId,
          amount: price.amount,
          currency: price.currency,
          effectiveAt: price.effectiveAt,
        })),
      );
    }

    if (input.nextStatus) {
      await scope.orm.public.CourseStatus.create({
        courseId,
        name: input.nextStatus,
      });
    }

    const updatedCourse = await this.adminCourseDetailsQuery(
      scope.orm.public.Course,
    )
      .where((candidate) => candidate.id.eq(courseId))
      .first();

    if (!updatedCourse) {
      // throwing rolls back the caller's transaction
      throw new Error(`Updated course ${courseId} could not be loaded.`);
    }

    return updatedCourse;
  }
}
