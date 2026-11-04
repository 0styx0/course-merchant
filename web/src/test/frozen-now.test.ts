import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";
import { FROZEN_NOW } from "./frozen-now";

describe("frozen test clock", () => {
  it("starts every test at 2026-11-04 12:00 UTC", () => {
    expect(new Date(Date.now()).toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(Temporal.Now.instant().toString()).toBe("2026-11-04T12:00:00Z");
  });

  it("keeps real timers running", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(Date.now()).toBe(FROZEN_NOW);
  });

  // These two run in file order: the second proves the setup file reset what the first set.
  it("sets a later time (first of a pair)", () => {
    vi.setSystemTime(FROZEN_NOW + 60_000);

    expect(Date.now()).toBe(FROZEN_NOW + 60_000);
  });

  it("starts at FROZEN_NOW again (second of a pair)", () => {
    expect(Date.now()).toBe(FROZEN_NOW);
  });

  describe("Temporal.Now", () => {
    it("reads the frozen time from every method", () => {
      expect(Temporal.Now.instant().toString()).toBe("2026-11-04T12:00:00Z");
      expect(Temporal.Now.zonedDateTimeISO("UTC").toString()).toBe(
        "2026-11-04T12:00:00+00:00[UTC]",
      );
      expect(Temporal.Now.plainDateTimeISO("UTC").toString()).toBe(
        "2026-11-04T12:00:00",
      );
      expect(Temporal.Now.plainDateISO("UTC").toString()).toBe("2026-11-04");
      expect(Temporal.Now.plainTimeISO("UTC").toString()).toBe("12:00:00");
    });

    it("reads the local time of the zone a method gets", () => {
      expect(Temporal.Now.zonedDateTimeISO("Asia/Tokyo").toString()).toBe(
        "2026-11-04T21:00:00+09:00[Asia/Tokyo]",
      );
      expect(Temporal.Now.plainDateTimeISO("Asia/Tokyo").toString()).toBe(
        "2026-11-04T21:00:00",
      );
      expect(Temporal.Now.plainDateISO("Pacific/Kiritimati").toString()).toBe(
        "2026-11-05",
      );
      expect(Temporal.Now.plainTimeISO("America/New_York").toString()).toBe(
        "07:00:00",
      );
    });

    it("reads the frozen time in the machine zone when a method gets no zone", () => {
      const machineZone = Temporal.Now.timeZoneId();
      const frozenInMachineZone = Temporal.Instant.from(
        "2026-11-04T12:00:00Z",
      ).toZonedDateTimeISO(machineZone);

      expect(Temporal.Now.zonedDateTimeISO().toString()).toBe(
        frozenInMachineZone.toString(),
      );
      expect(Temporal.Now.plainDateTimeISO().toString()).toBe(
        frozenInMachineZone.toPlainDateTime().toString(),
      );
      expect(Temporal.Now.plainDateISO().toString()).toBe(
        frozenInMachineZone.toPlainDate().toString(),
      );
      expect(Temporal.Now.plainTimeISO().toString()).toBe(
        frozenInMachineZone.toPlainTime().toString(),
      );
    });

    it("moves with vi.setSystemTime", () => {
      vi.setSystemTime(FROZEN_NOW + 60_000);

      expect(Temporal.Now.instant().toString()).toBe("2026-11-04T12:01:00Z");
      expect(Temporal.Now.plainTimeISO("UTC").toString()).toBe("12:01:00");
    });

    it("replaces every method that returns a time", () => {
      const methodsThatReturnATime = Object.getOwnPropertyNames(
        Temporal.Now,
      ).filter((name) => name !== "timeZoneId");

      expect(methodsThatReturnATime.length).toBeGreaterThan(0);
      methodsThatReturnATime.forEach((name) => {
        expect(
          vi.isMockFunction(Temporal.Now[name as keyof typeof Temporal.Now]),
        ).toBe(true);
      });
    });
  });
});
