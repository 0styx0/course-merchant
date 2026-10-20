import { Temporal } from "@js-temporal/polyfill";

import { formatDate } from "@/utils/formatters.js";
import { GetCourseAdminResponse, GetCourseResponse } from "types.js";
import type {
    CourseRepositoryModelPublic,
} from "./courses.repository/courses.repository.js";
import { CourseRepositoryModelAdmin } from "./courses.repository/admin-courses.repository.js";

export function toPublicCourseResponse(
    course: CourseRepositoryModelPublic,
): GetCourseResponse {
    const [price] = course.prices;

    return {
        id: course.id,
        name: course.title,
        description: course.description,
        enrollmentCount: course.enrollments,
        price: {
            amount: price.amount,
            currency: price.currency,
        },
        schedule: {
            startTime: formatDate(course.startsAt),
            endTime: formatDate(course.endsAt),
            timeZone: course.timeZone,
        },
    };
}

export function toAdminCourseResponse(
    course: CourseRepositoryModelAdmin,
): GetCourseAdminResponse {
    const formatCourseDate = (time: Temporal.Instant) =>
        formatDate(time);

    return {
        id: course.id,
        name: course.title,
        description: course.description,
        schedule: {
            startTime: formatCourseDate(course.startsAt),
            endTime: formatCourseDate(course.endsAt),
            timeZone: course.timeZone,
        },
        status: {
            name: course.statuses[0].name,
            changedAt: formatCourseDate(course.statuses[0].changedAt),
        },
        prices: course.prices.map((price) => ({
            id: price.id,
            amount: price.amount,
            currency: price.currency,
            effectiveAt: formatCourseDate(price.effectiveAt),
        })),
        enrollments: course.enrollments.map((enrollment) => ({
            customer: {
                id: enrollment.customer.id,
                name: enrollment.customer.name,
                email: enrollment.customer.email,
            },
            payment: {
                status: enrollment.payment.status,
                amount: enrollment.payment.amount,
                paidAt: formatCourseDate(enrollment.payment.paidAt),
            },
        })),
    };
}