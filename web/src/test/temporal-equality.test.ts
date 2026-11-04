import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

const earlier = () => Temporal.Instant.from("2020-01-01T00:00:00Z");
const later = () => Temporal.Instant.from("2030-01-01T00:00:00Z");

describe("Temporal equality tester", () => {
  it("fails an object check on two different instants", () => {
    expect(() =>
      expect({ at: earlier() }).toMatchObject({ at: later() }),
    ).toThrow();
  });

  it("passes an object check on two equal instants built separately", () => {
    expect({ at: earlier() }).toMatchObject({ at: earlier() });
  });

  it("calls Temporal values of different kinds unequal", () => {
    const plainDate = Temporal.PlainDate.from("2020-01-01");
    expect(() =>
      expect({ at: earlier() }).toMatchObject({ at: plainDate }),
    ).toThrow();
  });

  it("calls a Temporal value unequal to its JSON string, both ways", () => {
    expect(() =>
      expect({ at: earlier() }).toMatchObject({ at: earlier().toString() }),
    ).toThrow();
    expect(() =>
      expect({ at: earlier().toString() }).toMatchObject({ at: earlier() }),
    ).toThrow();
  });

  it("checks a time nested in an array inside an object check", () => {
    expect(() =>
      expect({ times: [earlier()] }).toMatchObject({ times: [later()] }),
    ).toThrow();
    expect({ times: [earlier()] }).toMatchObject({ times: [earlier()] });
  });

  it("calls a Temporal value unequal to null and undefined", () => {
    expect(() =>
      expect({ at: earlier() }).toMatchObject({ at: null }),
    ).toThrow();
    expect(() =>
      expect({ at: null }).toMatchObject({ at: earlier() }),
    ).toThrow();
    expect(() =>
      expect({ at: undefined }).toMatchObject({ at: earlier() }),
    ).toThrow();
  });

  it("calls equal durations written differently unequal (PT1H against PT60M)", () => {
    expect(() =>
      expect({ length: Temporal.Duration.from("PT1H") }).toMatchObject({
        length: Temporal.Duration.from("PT60M"),
      }),
    ).toThrow();
  });

  describe("without a Temporal value", () => {
    it("keeps the result for plain objects", () => {
      expect({ a: 1, b: { c: 2 } }).toMatchObject({ b: { c: 2 } });
      expect(() => expect({ a: 1 }).toMatchObject({ a: 2 })).toThrow();
    });

    it("keeps the result for dates", () => {
      expect({ at: new Date(0) }).toMatchObject({ at: new Date(0) });
      expect(() =>
        expect({ at: new Date(0) }).toMatchObject({ at: new Date(1) }),
      ).toThrow();
    });

    it("keeps the result for strings", () => {
      expect({ a: "x" }).toMatchObject({ a: "x" });
      expect(() => expect({ a: "x" }).toMatchObject({ a: "y" })).toThrow();
    });

    it("keeps expect.any(Temporal.Instant) matching an instant", () => {
      expect({ at: earlier() }).toMatchObject({
        at: expect.any(Temporal.Instant),
      });
    });
  });
});
