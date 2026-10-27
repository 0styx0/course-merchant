import { Temporal } from "@js-temporal/polyfill";
import sharp from "sharp";
import { db } from "../prisma/db.js";
import { instant } from "./test-helpers.js";
import { Models } from "@/prisma/contract.js";

let tinyWebp: Promise<Buffer> | undefined;

function tinyImage() {
  tinyWebp ??= sharp({
    create: { width: 16, height: 9, channels: 3, background: "#3366cc" },
  })
    .webp()
    .toBuffer();

  return tinyWebp;
}

/**
 * Creates a course whose latest status is `status`. A published course also
 * gets an image, as the API only publishes courses that have one.
 */
export async function createCourse(input: {
  status?: "published" | "drafted" | "archived";
  title: string;
  summary: string;
  description: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
}) {
  const status = input.status ?? "published";

  const course = await db.orm.public.Course.create({
    title: input.title,
    summary: input.summary,
    description: input.description,
    contentUrl: "https://example.com/course",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timeZone: input.timeZone,
    statuses: (statuses) =>
      // use a status far in past, so tests can easly clobber it
      statuses.create([
        { name: status, changedAt: instant("1970-01-01T10:00:00-04:00") },
      ]),
  });

  if (status === "published") {
    await db.orm.public.CourseImage.create({
      courseId: course.id,
      bytes: await tinyImage(),
      updatedAt: Temporal.Now.instant(),
    });
  }

  return course;
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
    summary: "Learn React",
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
  // defaults to now
  createdAt?: Temporal.Instant;
}) {
  return db.orm.public.Payment.create({
    customerId: input.customerId,
    coursePriceId: input.coursePriceId,
    provider: "stripe",
    status: "pending",
    amount: input.amount,
    currency: input.currency,
    providerCheckoutId: input.providerCheckoutId ?? null,
    createdAt: input.createdAt,
  });
}

export async function createEnrollment(input: {
  courseId: string;
  customerId: string;
  // omitted for a free course
  paymentId?: string;
  revokedAt?: Temporal.Instant;
  suspendedAt?: Temporal.Instant;
}) {
  return db.orm.public.Enrollment.create({
    courseId: input.courseId,
    customerId: input.customerId,
    paymentId: input.paymentId,
    revokedAt: input.revokedAt,
    suspendedAt: input.suspendedAt,
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
