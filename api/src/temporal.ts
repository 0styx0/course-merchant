import { Temporal } from "@js-temporal/polyfill";

// The ORM builds its timestamps from the global `Temporal`, and only falls back
// to its own bundled polyfill when none exists. Setting it here keeps the app
// and the tests on the same implementation as the rest of our code.
globalThis.Temporal = Temporal;
