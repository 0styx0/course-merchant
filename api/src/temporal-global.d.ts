import type { Temporal as PolyfillTemporal } from "@js-temporal/polyfill";

// allows Prisma to type Temporal fields (eg, course.startedAt) instead of using `any`
declare global {
  namespace Temporal {
    type Instant = PolyfillTemporal.Instant;
    type PlainDate = PolyfillTemporal.PlainDate;
    type PlainDateTime = PolyfillTemporal.PlainDateTime;
    type PlainTime = PolyfillTemporal.PlainTime;
  }
}
