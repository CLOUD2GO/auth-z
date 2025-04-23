/**
 * Creates a unique identifier for a request based on the HTTP method and path.
 * The identifier is in the format of `METHOD path`, where `METHOD` is the
 * uppercase HTTP method and `path` is the lowercase path.
 * @param method The HTTP method (e.g. GET, POST, PUT, DELETE)
 * @param path The path of the request
 * @returns A string representing the unique identifier for the request
 */
export default function requestKind(method: string, path: string): string {
    return `${method.toUpperCase()} ${path.toLowerCase()}`;
}
