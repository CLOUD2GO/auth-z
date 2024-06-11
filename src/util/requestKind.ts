export default function requestKind(method: string, path: string): string {
    return `${method.toUpperCase()} ${path.toLowerCase()}`;
}
