import { OptionalOptions } from '../interfaces/Options';

const defaultOptions: OptionalOptions = {
    authentication: {
        expirationTimeSpan: 3600,
        method: 'POST',
        path: '/authenticate'
    }
};

export default {
    defaultOptions,
    util: {
        emptyObject: {} as const
    } as const,
    authentication: {
        jwtIssuer: '@cloud2go/auth-z Server',
        jwtAudience: '@cloud2go/auth-z Client',
        jwtSubject: '@cloud2go/auth-z User'
    } as const,
    authorization: {
        resources: {
            default: '__INTERNAL::[DEFAULT]__',
            any: '__INTERNAL::[ANY]__',
            all: 'All',
            empty: [] as string[]
        } as const,
        scope: {
            validationRegex: /^[A-Z0-9_-]+$/i
        } as const,
        actions: ['Read', 'Write', 'ReadWrite'] as const,
        keyGeneration: {
            glue: ':'
        } as const
    } as const
} as const;
