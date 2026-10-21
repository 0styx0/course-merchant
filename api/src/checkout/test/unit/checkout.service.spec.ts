import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StartCheckoutRequest } from "types.js";
import { CheckoutRepository } from "@/checkout/checkout.repository.js";
import { CheckoutService } from "@/checkout/checkout.service.js";
import { CoursesRepository } from "@/courses/courses.repository/courses.repository.js";
import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";

const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
const CUSTOMER_ID = "8b0e1f5c-0000-4000-8000-000000000002";

const request: StartCheckoutRequest = {
  courseId: COURSE_ID,
  name: "Ada Lovelace",
  email: "ada@example.com",
};

function makeCourse(overrides: { amount?: number; endsAt?: Temporal.Instant } = {}) {
  const now = Temporal.Now.instant();

  return {
    id: COURSE_ID,
    title: "React Fundamentals",
    description: "Learn React",
    startsAt: now.add({ hours: 24 }),
    endsAt: overrides.endsAt ?? now.add({ hours: 26 }),
    timeZone: "UTC",
    prices: [{ amount: overrides.amount ?? 0, currency: "USD" }],
    enrollments: 0,
  };
}

const revokedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

describe("CheckoutService", () => {
  const tx = { orm: {} };

  let service: CheckoutService;
  let coursesRepository: { findById: ReturnType<typeof vi.fn> };
  let checkoutRepository: {
    findOrCreateCustomer: ReturnType<typeof vi.fn>;
    findEnrollment: ReturnType<typeof vi.fn>;
    grantFreeAccess: ReturnType<typeof vi.fn>;
  };
  let emailOutbox: {
    enqueue: ReturnType<typeof vi.fn>;
    countQueuedSince: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    coursesRepository = { findById: vi.fn().mockResolvedValue(makeCourse()) };
    checkoutRepository = {
      findOrCreateCustomer: vi.fn().mockResolvedValue({
        id: CUSTOMER_ID,
        email: request.email,
        name: request.name,
      }),
      findEnrollment: vi.fn().mockResolvedValue(null),
      grantFreeAccess: vi.fn().mockResolvedValue(true),
    };
    emailOutbox = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      countQueuedSince: vi.fn().mockResolvedValue(0),
    };

    // runs the callback with a stand-in transaction, as the real one would
    const prisma = {
      db: { transaction: vi.fn((work: (scope: typeof tx) => unknown) => work(tx)) },
    };

    service = new CheckoutService(
      prisma as unknown as PrismaService,
      coursesRepository as unknown as CoursesRepository,
      checkoutRepository as unknown as CheckoutRepository,
      emailOutbox as unknown as EmailOutboxRepository,
    );
  });

  const emailIds = { courseId: COURSE_ID, customerId: CUSTOMER_ID };

  describe("course checks", () => {
    it("returns 404 COURSE_NOT_FOUND when the course isn't publicly viewable", async () => {
      coursesRepository.findById.mockResolvedValue(null);

      await expect(service.startCheckout(request)).rejects.toMatchObject({
        status: 404,
        response: {
          code: "COURSE_NOT_FOUND",
          detail: `No course exists with ID ${COURSE_ID}.`,
        },
      });
      expect(checkoutRepository.findOrCreateCustomer).not.toHaveBeenCalled();
    });

    it("returns 409 COURSE_NOT_PURCHASABLE once the course has ended", async () => {
      coursesRepository.findById.mockResolvedValue(
        makeCourse({ endsAt: Temporal.Now.instant().subtract({ minutes: 1 }) }),
      );

      await expect(service.startCheckout(request)).rejects.toMatchObject({
        status: 409,
        response: {
          code: "COURSE_NOT_PURCHASABLE",
          detail: "This course has ended and can no longer be bought.",
        },
      });
      expect(checkoutRepository.findOrCreateCustomer).not.toHaveBeenCalled();
    });

    it("creates the customer with the request's name and email", async () => {
      await service.startCheckout(request);

      expect(checkoutRepository.findOrCreateCustomer).toHaveBeenCalledWith(tx, {
        email: "ada@example.com",
        name: "Ada Lovelace",
      });
    });
  });

  describe("a buyer who already has access", () => {
    beforeEach(() => {
      checkoutRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        revokedAt: null,
        suspendedAt: null,
      });
    });

    it("emails them their link and returns check_email", async () => {
      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
        kind: "already_owned",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: false },
      });
      expect(checkoutRepository.grantFreeAccess).not.toHaveBeenCalled();
    });

    it("answers the same way for a paid course", async () => {
      coursesRepository.findById.mockResolvedValue(makeCourse({ amount: 9900 }));

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
    });
  });

  describe("a suspended buyer", () => {
    it.each([
      ["suspended", { revokedAt: null, suspendedAt }],
      ["suspended and refunded", { revokedAt, suspendedAt }],
    ])("is emailed without a link when %s", async (_label, timestamps) => {
      checkoutRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        ...timestamps,
      });

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
        kind: "access_suspended",
        recipient: "ada@example.com",
        payload: emailIds,
      });
      expect(checkoutRepository.grantFreeAccess).not.toHaveBeenCalled();
    });
  });

  describe("a free course", () => {
    it.each([
      ["a new buyer", null],
      ["a refunded buyer", { id: "enrollment", revokedAt, suspendedAt: null }],
    ])("grants access to %s and emails the link", async (_label, enrollment) => {
      checkoutRepository.findEnrollment.mockResolvedValue(enrollment);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(checkoutRepository.grantFreeAccess).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        CUSTOMER_ID,
        expect.any(Temporal.Instant),
      );
      expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
        kind: "access_granted",
        recipient: "ada@example.com",
        payload: emailIds,
      });
    });

    it("sends nothing when a concurrent request granted access first", async () => {
      checkoutRepository.grantFreeAccess.mockResolvedValue(false);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("the per-address email cap", () => {
    it("counts the recipient's emails over the last 24 hours", async () => {
      const before = Temporal.Now.instant();
      await service.startCheckout(request);
      const after = Temporal.Now.instant();

      const [scope, recipient, since] = emailOutbox.countQueuedSince.mock.calls[0];

      expect(scope).toBe(tx);
      expect(recipient).toBe("ada@example.com");
      expect(
        Temporal.Instant.compare(since, before.subtract({ hours: 24 })),
      ).toBeGreaterThanOrEqual(0);
      expect(
        Temporal.Instant.compare(since, after.subtract({ hours: 24 })),
      ).toBeLessThanOrEqual(0);
    });

    it("queues below the cap", async () => {
      emailOutbox.countQueuedSince.mockResolvedValue(4);

      await service.startCheckout(request);

      expect(emailOutbox.enqueue).toHaveBeenCalledOnce();
    });

    it("still grants free access but queues nothing at the cap", async () => {
      emailOutbox.countQueuedSince.mockResolvedValue(5);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(checkoutRepository.grantFreeAccess).toHaveBeenCalled();
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });
});
