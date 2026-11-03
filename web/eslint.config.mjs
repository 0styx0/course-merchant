import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // style limits for hand-written code; tests skip the file length limit (below).
    files: ["src/**/*.{ts,tsx}"],
    // generated and vendored (shadcn) code isn't held to the length rules
    ignores: ["src/lib/api/generated.ts", "src/components/ui/**"],
    rules: {
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      "max-statements": ["error", 10],
      "max-depth": ["error", 3],
      complexity: ["error", 10],
      "no-nested-ternary": "error",
      "no-else-return": "error",
      "no-lonely-if": "error",
      "prefer-const": "error",
    },
  },
  {
    // test files wrap everything in a describe callback, long by design, and
    // a test file may grow with its behaviours (a split never drops a test)
    files: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.fixtures.{ts,tsx}",
      "src/test/**",
    ],
    rules: { "max-statements": "off", "max-lines": "off" },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      // a helper named expect… holds the assertions of the tests that call it
      "vitest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expect*"] },
      ],
      "vitest/valid-expect": "error",
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-conditional-expect": "error",
    },
  },
]);

export default eslintConfig;
