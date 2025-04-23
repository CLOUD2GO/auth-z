/**
 * Standardized response error object
 */
export type ResponseError<T extends string> = {
    error: T;
};

/**
 * Helper function that returns a standardized response error object
 * @param message The error message
 * @returns The standardized response error object
 * @typeParam T The type of the error message
 */
export default function responseError<T extends string = string>(
    message: T
): ResponseError<T> {
    return {
        error: message
    };
}
