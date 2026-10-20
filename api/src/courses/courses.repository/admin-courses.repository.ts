import { Models } from "@/prisma/contract.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { Temporal } from "@js-temporal/polyfill";
import { Injectable, Inject } from "@nestjs/common";
import { and } from "@prisma/orm-postgres/orm-client";

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
    initialStatus: Exclude<
        Models.public_CourseStatus["name"],
        "deleted"
    >;
    prices: {
        amount: number;
        currency: string;
        effectiveAt: Temporal.Instant;
    }[];
};

@Injectable()
export class AdminCoursesRepository {
    constructor(
        @Inject(PrismaService)
        private readonly prisma: PrismaService,
    ) { }

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