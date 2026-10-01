import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db.js";


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


export async function createCustomer(input: {
  email?: string;
}) {
  return db.orm.public.Customer.create({
    email: input.email ?? `test-${crypto.randomUUID()}@example.com`,
  });
}


export async function createPayment(input: {
  customerId: string;
  coursePriceId: string;
  amount: number;
  currency: string;
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
  });
}


export async function createEnrollment(input: {
  courseId: string;
  customerId: string;
  paymentId: string;
}) {
  return db.orm.public.Enrollment.create({
    courseId: input.courseId,
    customerId: input.customerId,
    paymentId: input.paymentId,
  });
}