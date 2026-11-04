import { describe, expect, it } from "vitest";

import { emailSchema } from "@/common/validation/email.schema.js";

// 64 + "@" + 63 + "." + 63 + "." + a last label of 61 or 62 characters
function emailOfLength(length: 254 | 255) {
  const lastLabel = "d".repeat(length - 193);
  return `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${lastLabel}`;
}

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("accepts 254 characters", () => {
    const email = emailOfLength(254);

    expect(email).toHaveLength(254);
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it("rejects more than 254 characters", () => {
    const email = emailOfLength(255);

    expect(email).toHaveLength(255);
    expect(emailSchema.safeParse(email).success).toBe(false);
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("ada.example.com").success).toBe(false);
  });

  describe("error sentences", () => {
    const incompleteSentence =
      "That email address looks incomplete. It should look like name@example.com.";
    const tooLongSentence =
      "That email address is too long. Use 254 characters or fewer.";

    function sentencesFor(input: string) {
      const result = emailSchema.safeParse(input);
      return result.success ? [] : result.error.issues.map((i) => i.message);
    }

    it.each(["ada.example.com", "a@b"])("words %s as incomplete", (input) => {
      expect(sentencesFor(input)).toEqual([incompleteSentence]);
    });

    it("gives only the length sentence for a 255-character address", () => {
      expect(sentencesFor(emailOfLength(255))).toEqual([tooLongSentence]);
    });

    it("gives only the length sentence for a long address with no @", () => {
      expect(sentencesFor("a".repeat(255))).toEqual([tooLongSentence]);
    });
  });
});
