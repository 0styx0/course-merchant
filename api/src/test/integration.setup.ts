import "../temporal.js";
import { afterAll, beforeEach } from "vitest";
import { db } from "../prisma/db.js";

beforeEach(async () => {
  await db.orm.public.EnrollmentEmail.where({}).deleteAll();
  await db.orm.public.Enrollment.where({}).deleteAll();
  await db.orm.public.Payment.where({}).deleteAll();

  await Promise.all([
    db.orm.public.EmailOutbox.where({}).deleteAll(),
    db.orm.public.CourseStatus.where({}).deleteAll(),
    db.orm.public.CoursePrice.where({}).deleteAll(),
    db.orm.public.CourseImage.where({}).deleteAll(),
  ]);

  await Promise.all([
    db.orm.public.Customer.where({}).deleteAll(),
    db.orm.public.Course.where({}).deleteAll(),
  ]);

  await db.orm.public.ProcessedPaymentEvent.where({}).deleteAll();
  await Promise.all([
    db.orm.public.AdminSession.where({}).deleteAll(),
    db.orm.public.AdminLoginAttempt.where({}).deleteAll(),
  ]);
  await db.orm.public.Admin.where({}).deleteAll();
});

afterAll(async () => {
  await db.close();
});
