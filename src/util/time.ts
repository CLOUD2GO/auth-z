export function milliseconds(ms: number) {
    return ms;
}

export function seconds(s: number) {
    return milliseconds(s) * 1000;
}

export function minutes(m: number) {
    return seconds(m) * 60;
}

export function hours(h: number) {
    return minutes(h) * 60;
}

export function toMilliseconds(ms: number) {
    return ms;
}

export function toSeconds(ms: number) {
    return toMilliseconds(ms) / 1000;
}

export function toMinutes(ms: number) {
    return toSeconds(ms) / 60;
}

export function toHours(ms: number) {
    return toMinutes(ms) / 60;
}

export function now() {
    return new Date(Date.now());
}

export function nowISO() {
    return now().toISOString();
}

export function fromNow(ms: number) {
    return new Date(Date.now() + ms);
}

export function millisFromNow(ms: number) {
    return Number(fromNow(ms)) - Number(now());
}