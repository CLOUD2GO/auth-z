/**
 * Helper function that checks if all the properties of an object are defined
 * and throws an error if any of them are undefined
 * @param object The object to check
 * @param prefix The prefix to add to the error message
 * @throws Error if any of the properties are undefined
 */
export default function deepCheckObject(
    object: object,
    prefix: string = ''
): void {
    for (const [key, value] of Object.entries(object)) {
        if (value === undefined)
            throw new Error(`Missing required option: ${prefix}${key}`);

        if (typeof value === 'object' && value !== null)
            deepCheckObject(value, `${prefix}${key}.`);
    }
}
