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
      "max-lines-per-function": [
        "error",
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["error", 3],
      complexity: ["error", 10],
      "no-nested-ternary": "error",
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
    rules: { "max-lines-per-function": "off", "max-lines": "off" },
  },
]);

export default eslintConfig;
