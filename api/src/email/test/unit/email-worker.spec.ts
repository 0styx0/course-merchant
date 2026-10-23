import { describe, expect, it, vi } from "vitest";

import { EmailWorker } from "@/email/email-worker.js";

describe("EmailWorker", () => {
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
    );
    vi.spyOn(worker["logger"], "error").mockImplementation(() => undefined);

    await worker.runIfIdle();
    await worker.runIfIdle();

    expect(findDue).toHaveBeenCalledTimes(2);
  });
});
