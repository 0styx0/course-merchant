import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it, vi } from "vitest";

import { EmailWorker } from "@/email/email-worker.js";

describe("EmailWorker", () => {
  const clock = {
    now: vi
      .fn()
      .mockResolvedValue(Temporal.Instant.from("2026-10-23T12:00:00Z")),
  } as never;

  it("skips a run while the previous one is still going", async () => {
    let finishLookup!: (emails: never[]) => void;
    const findDue = vi.fn().mockReturnValue(
      new Promise<never[]>((resolve) => {
        finishLookup = resolve;
      }),
    );
    const worker = new EmailWorker(
      { db: {} } as never,
      { findDue } as never,
      {} as never,
      {} as never,
      clock,
    );

    const firstRun = worker.runIfIdle();
    await worker.runIfIdle();

    expect(findDue).toHaveBeenCalledTimes(1);

    finishLookup([]);
    await firstRun;
    await worker.runIfIdle();

    expect(findDue).toHaveBeenCalledTimes(2);
  });

  it("recovers when reading the outbox fails", async () => {
    const findDue = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue([]);
    const worker = new EmailWorker(
      { db: {} } as never,
      { findDue } as never,
      {} as never,
      {} as never,
      clock,
    );
    vi.spyOn(worker["logger"], "error").mockImplementation(() => undefined);

    await worker.runIfIdle();
    await worker.runIfIdle();

    expect(findDue).toHaveBeenCalledTimes(2);
  });

  it("doesn't send an email another worker claimed", async () => {
    const email = { id: "email-1" };
    const claim = vi.fn().mockResolvedValue(false);
    const compose = vi.fn();
    const worker = new EmailWorker(
      { db: {} } as never,
      { findDue: vi.fn().mockResolvedValue([email]), claim } as never,
      { compose } as never,
      {} as never,
      clock,
    );

    await worker.sendDueEmails();

    expect(claim).toHaveBeenCalledTimes(1);
    expect(compose).not.toHaveBeenCalled();
  });

  it("starts no run once shutting down", async () => {
    const findDue = vi.fn().mockResolvedValue([]);
    const worker = new EmailWorker(
      { db: {} } as never,
      { findDue } as never,
      {} as never,
      {} as never,
      clock,
    );

    await worker.onApplicationShutdown();
    await worker.runIfIdle();

    expect(findDue).not.toHaveBeenCalled();
  });

  it("waits for the run in progress when shutting down", async () => {
    let finishLookup!: (emails: never[]) => void;
    const findDue = vi.fn().mockReturnValue(
      new Promise<never[]>((resolve) => {
        finishLookup = resolve;
      }),
    );
    const worker = new EmailWorker(
      { db: {} } as never,
      { findDue } as never,
      {} as never,
      {} as never,
      clock,
    );
    let hasShutDown = false;

    const run = worker.runIfIdle();
    const shutdown = worker.onApplicationShutdown().then(() => {
      hasShutDown = true;
    });
    await Promise.resolve();

    expect(hasShutDown).toBe(false);

    finishLookup([]);
    await Promise.all([run, shutdown]);

    expect(hasShutDown).toBe(true);
  });
});
