import { Temporal } from "@js-temporal/polyfill";

/**
 * 
 * @returns date conforming to api spec 
 */
export function formatDate(date: Temporal.Instant, timeZone: string) {

    return date
        .toZonedDateTimeISO(timeZone)
        .toString({
            timeZoneName: "never",
        })
}