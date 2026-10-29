import { describe, expect, it } from "vitest";

import { HashingSlots } from "@/auth/login/hashing-slots.js";

describe("HashingSlots", () => {
  it("refuses a caller once every slot is taken", () => {
    const slots = new HashingSlots(2);

    expect(slots.tryAcquire()).toBeTypeOf("function");
    expect(slots.tryAcquire()).toBeTypeOf("function");
    expect(slots.tryAcquire()).toBeNull();
  });

  it("frees a slot when its holder releases it", () => {
    const slots = new HashingSlots(1);
    const release = slots.tryAcquire();

    release?.();

    expect(slots.tryAcquire()).toBeTypeOf("function");
  });

  it("frees a slot only once, however often it is released", () => {
    const slots = new HashingSlots(1);
    const release = slots.tryAcquire();

    release?.();
    release?.();
    slots.tryAcquire();

    expect(slots.tryAcquire()).toBeNull();
  });

  it("frees a slot after the work threw, when released in finally", () => {
    const slots = new HashingSlots(1);
    const failing = () => {
      const release = slots.tryAcquire();

      try {
        throw new Error("hashing failed");
      } finally {
        release?.();
      }
    };

    expect(failing).toThrow("hashing failed");
    expect(slots.tryAcquire()).toBeTypeOf("function");
  });
});
