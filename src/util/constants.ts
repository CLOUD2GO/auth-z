import { OptionalOptions } from '../interfaces/Options';

const defaultOptions: OptionalOptions = {
    authenticationPath: '/authenticate',
    authentication: {
        expirationTimeSpan: 3600
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
            all: 'All'
        } as const
    } as const
} as const;
