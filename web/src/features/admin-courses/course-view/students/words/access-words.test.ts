import { describe, expect, it } from "vitest";

import { studentAccess } from "./access-words";

const suspendedAt = "2026-10-30T18:00:00Z";
const revokedAt = "2026-11-05T15:00:00Z";

describe("studentAccess", () => {
  it("reads Active, green, when neither date is set", () => {
    expect(studentAccess({ suspendedAt: null, revokedAt: null })).toEqual({
      word: "Active",
      colourPair: "success",
    });
  });

  it("reads Suspended, grey, with its date when suspendedAt is set", () => {
    expect(studentAccess({ suspendedAt, revokedAt: null })).toEqual({
      word: "Suspended",
      colourPair: "muted",
      suspendedAt,
    });
  });

  it("reads Suspended when both dates are set, because a suspension outranks an un-enroll", () => {
    expect(studentAccess({ suspendedAt, revokedAt })).toEqual({
      word: "Suspended",
      colourPair: "muted",
      suspendedAt,
    });
  });

  it("reads Un-enrolled, grey, when revokedAt alone is set", () => {
    expect(studentAccess({ suspendedAt: null, revokedAt })).toEqual({
      word: "Un-enrolled",
      colourPair: "muted",
    });
  });
});
