import { afterAll, beforeEach } from "vitest";

import { db } from "../prisma/db.js";

beforeEach(async () => {
    await db.orm.public.Enrollment.where({}).deleteAll();
    await db.orm.public.Payment.where({}).deleteAll();
    
    await Promise.all([
      db.orm.public.PaymentProviderCustomer.where({}).deleteAll(),
      db.orm.public.CoursePrice.where({}).deleteAll(),
    ]);
    
    await Promise.all([
      db.orm.public.Customer.where({}).deleteAll(),
      db.orm.public.Course.where({}).deleteAll(),
    ]);
    
    await db.orm.public.ProcessedPaymentEvent.where({}).deleteAll();
});

afterAll(async () => {
    await db.close();
});