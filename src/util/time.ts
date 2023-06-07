/**
 * This file contains time operations, with the nomenclature being:
 * `<time unit>`: Conversion of the time unit to milliseconds
 * `to<time unit>`: Conversion of milliseconds to the time unit
 * others: Utility functions
 */

/**
 * Conversion of milliseconds to milliseconds, used for naming consistency.
 * Example: `milliseconds(1000)` will return `1000`
 */
export function milliseconds(ms: number): number {
    return ms;
}

/**
 * Conversion of seconds to milliseconds. For example:
 * `seconds(1)` will return `1000`
 */
export function seconds(s: number): number {
    return milliseconds(s) * 1000;
}

/**
 * Conversion of minutes to milliseconds. For example:
 * `minutes(1)` will return `60000`
 */
export function minutes(m: number): number {
    return seconds(m) * 60;
}

/**
 * Conversion of hours to milliseconds. Fox example:
 * `hours(1)` will return `3600000`
 */
export function hours(h: number): number {
    return minutes(h) * 60;
}

/**
 * Conversion of milliseconds to milliseconds, used for naming consistency.
 * For example: `toMilliseconds(1000)` will return `1000`
 */
export function toMilliseconds(ms: number): number {
    return ms;
}

/**
 * Conversion of milliseconds to seconds. For example:
 * `toSeconds(1000)` will return `1`
 */
export function toSeconds(ms: number): number {
    return toMilliseconds(ms) / 1000;
}

/**
 * Conversion of milliseconds to minutes. For example:
 * `toMinutes(60000)` will return `1`
 */
export function toMinutes(ms: number): number {
    return toSeconds(ms) / 60;
}

/**
 * Conversion of milliseconds to hours. For example:
 * `toHours(3600000)` will return `1`
 */
export function toHours(ms: number): number {
    return toMinutes(ms) / 60;
}

/**
 * Get the current date and time as a `Date` object
 */
export function now(): Date {
    return new Date(Date.now());
}

/**
 * Get the current date and time based on the `ISO 8601` format
 * (default JavaScript ISO format)
 */
export function nowISO(): string {
    return now().toISOString();
}

/**
 * Adds milliseconds to the current date and time, for example:
 * `fromNow(seconds(3))` will return the date and time 3 second from now
 * in the future
 */
export function fromNow(ms: number): Date {
    return new Date(Date.now() + ms);
}
