import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// a true/false name reads as a question or a fact: isSaved, hasEnded, doesExist.
// The rule checks the format after it trims the prefix, so `isSaved` is `Saved`.
const BOOLEAN_NAMING = [
  {
    selector: ["variable", "parameter", "typeProperty"],
    types: ["boolean"],
    format: ["PascalCase"],
    prefix: ["is", "has", "should", "can", "did", "will", "does", "was"],
  },
  // The two exemptions below name `types` too: a selector with `types` outranks
  // one without, so the exemptions would lose to the selector above.
  // a name unpacked from an object keeps the object's field name
  {
    selector: ["variable", "parameter"],
    types: ["boolean"],
    modifiers: ["destructured"],
    format: null,
  },
  // a quoted name, such as an HTML attribute, keeps its own spelling
  {
    selector: "typeProperty",
    types: ["boolean"],
    modifiers: ["requiresQuotes"],
    format: null,
  },
];

// A function does one job, so its name never joins two with "And".
const NO_AND_IN_FUNCTION_NAMES = [
  {
    selector: "function",
    format: null,
    custom: { regex: "And[A-Z]", match: false },
  },
  {
    selector: "variable",
    types: ["function"],
    format: null,
    custom: { regex: "And[A-Z]", match: false },
  },
  {
    selector: "classMethod",
    format: null,
    custom: { regex: "And[A-Z]", match: false },
  },
];

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
    // the boolean naming rule reads each name's type
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        ...BOOLEAN_NAMING,
        ...NO_AND_IN_FUNCTION_NAMES,
      ],
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      "max-statements": ["error", 10],
      "max-depth": ["error", 3],
      complexity: ["error", 7],
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
