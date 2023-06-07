/**
 * Standardized response error object
 */
export type ResponseError<T extends string> = {
    error: T;
};

/**
 * Helper function that returns a standardized response error object
 */
export default function responseError<T extends string = string>(
    message: T
): ResponseError<T> {
    return {
        error: message
    };
}
