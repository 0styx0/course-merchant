import { describe, expect, it } from "vitest";

import {
  EmailPayloadInvalidError,
  parsePayload,
} from "@/email/email-payloads.js";

describe("parsePayload", () => {
  it("accepts a valid payload for each kind", () => {
    const ids = { courseId: "c1", customerId: "u1" };

    expect(parsePayload("access_granted", ids)).toEqual(ids);
    expect(
      parsePayload("already_owned", { ...ids, refundIssued: false }),
    ).toEqual({ ...ids, refundIssued: false });
    expect(
      parsePayload("access_suspended", { ...ids, refundIssued: true }),
    ).toEqual({ ...ids, refundIssued: true });
    expect(parsePayload("dispute_alert", { paymentId: "p1" })).toEqual({
      paymentId: "p1",
    });
  });

  it("ignores extra keys, so a newer row still reads", () => {
    expect(
      parsePayload("dispute_alert", { paymentId: "p1", note: "x" }),
    ).toEqual({ paymentId: "p1" });
  });

  it("names the missing and mistyped fields", () => {
    expect(() =>
      parsePayload("already_owned", { courseId: "c1", refundIssued: "yes" }),
    ).toThrow(
      new EmailPayloadInvalidError("already_owned", [
        "customerId",
        "refundIssued",
      ]),
    );
  });

  it("rejects a payload that isn't an object", () => {
    expect(() => parsePayload("dispute_alert", null)).toThrow(
      "dispute_alert payload is invalid ((root))",
    );
  });
});
