import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db.js";
import { instant } from "./test-helpers.js";
import { Models } from "@/prisma/contract.js";

export async function createCourse(input: {
  title: string;
  description: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
}) {
  return db.orm.public.Course.create({
    title: input.title,
    description: input.description,
    contentUrl: "https://example.com/course",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timeZone: input.timeZone,
    statuses: (statuses) =>
      // use a status far in past, so tests can easly clobber it
      statuses.create([
        { name: "published", changedAt: instant("1970-01-01T10:00:00-04:00") },
      ]),
  });
}

export async function createCoursePrice(input: {
  courseId: string;
  amount: number;
  currency: string;
  effectiveAt: Temporal.Instant;
}) {
  return db.orm.public.CoursePrice.create({
    courseId: input.courseId,
    amount: input.amount,
    currency: input.currency,
    effectiveAt: input.effectiveAt,
  });
}

type CoursePrice = Partial<Parameters<typeof createCoursePrice>[0]>;

export async function createPricedCourse(
  courseOverrides: Partial<Parameters<typeof createCourse>[0]> = {},
  priceOverrides: CoursePrice = {},
) {
  const course = await createCourse({
    title: "React Fundamentals",
    description: "Learn React",
    startsAt: instant("2026-10-01T18:00:00.000Z"),
    endsAt: instant("2026-10-01T20:00:00.000Z"),
    timeZone: "America/New_York",
    ...courseOverrides,
  });

  const price = await createCoursePrice({
    courseId: course.id,
    amount: 9900,
    currency: "USD",
    effectiveAt: instant("2026-09-01T00:00:00.000Z"),
    ...priceOverrides,
  });

  return {
    course,
    price,
  };
}

export async function createCustomer(input: { email?: string; name?: string }) {
  return db.orm.public.Customer.create({
    email: input.email ?? `test-${crypto.randomUUID()}@example.com`,
    name: input.name ?? `test-${crypto.randomUUID()}`,
  });
}

export async function createPayment(input: {
  customerId: string;
  coursePriceId: string;
  amount: number;
  currency: string;
  paidAt?: Temporal.Instant;
}) {
  return db.orm.public.Payment.create({
    customerId: input.customerId,
    coursePriceId: input.coursePriceId,
    provider: "stripe",
    status: "succeeded",
    amount: input.amount,
    currency: input.currency,
    providerPaymentId: `test-payment-${crypto.randomUUID()}`,
    createdAt: Temporal.Now.instant(),
    paidAt: input.paidAt || Temporal.Now.instant(),
  });
}

export async function createPendingPayment(input: {
  customerId: string;
  coursePriceId: string;
  amount: number;
  currency: string;
  providerCheckoutId?: string;
}) {
  return db.orm.public.Payment.create({
    customerId: input.customerId,
    coursePriceId: input.coursePriceId,
    provider: "stripe",
    status: "pending",
    amount: input.amount,
    currency: input.currency,
    providerCheckoutId: input.providerCheckoutId ?? null,
  });
}

export async function createEnrollment(input: {
  courseId: string;
  customerId: string;
  // omitted for a free course
  paymentId?: string;
}) {
  return db.orm.public.Enrollment.create({
    courseId: input.courseId,
    customerId: input.customerId,
    paymentId: input.paymentId,
  });
}

/** An email about the enrollment, stored as the outbox would after queueing. */
export async function createEnrollmentEmail(input: {
  enrollment: { id: string; courseId: string; customerId: string };
  recipient: string;
  status: Models.public_EmailOutbox["status"];
  createdAt?: Temporal.Instant;
}) {
  const { enrollment } = input;

  const email = await db.orm.public.EmailOutbox.create({
    kind: "access_granted",
    recipient: input.recipient,
    payload: {
      courseId: enrollment.courseId,
      customerId: enrollment.customerId,
    },
    status: input.status,
    attempts: 0,
    ...(input.createdAt && { createdAt: input.createdAt }),
  });

  await db.orm.public.EnrollmentEmail.create({
    emailId: email.id,
    enrollmentId: enrollment.id,
  });

  return email;
}

export function archiveCourse(courseId: string, archiveAt: Temporal.Instant) {
  return db.orm.public.CourseStatus.create({
    courseId,
    name: "archived",
    changedAt: archiveAt,
  });
}

export function updateCourseStatus(
  courseId: string,
  status: Models.public_CourseStatus["name"],
  changedAt: Temporal.Instant,
) {
  return db.orm.public.CourseStatus.create({
    courseId,
    name: status,
    changedAt: changedAt,
  });
}
