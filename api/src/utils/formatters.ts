import { Temporal } from "@js-temporal/polyfill";

/**
 * 
 * @returns date conforming to api spec 
 */
export function formatDate(date: Temporal.Instant) {
    return date.toString()
}