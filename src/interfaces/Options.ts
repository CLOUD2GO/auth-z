import { Request } from 'express';
import Awaitable from './Awaitable';
import { DeepPartial } from './DeepProp';
import Role from './Role';

export interface RequiredOptions {
    /**
     * Details for the JWT authentication.
     */
    authentication: {
        /**
         * A function that returns a **user unique identifier**, agnostic to authentication method or
         * information. This identifier will be used to generate the JWT for further requests.
         */
        userIdentifier: (request: Request) => Awaitable<string | null>;
        /**
         * The JWT signing secret, this value is considered the password of the application,
         * and should not be publicly available.
         */
        secret: string;
    };
    authorization: {
        /**
         * A function that returns the roles of a given user, identified by the `userIdentifier` callback.
         */
        rolesProvider: (userId: string) => Awaitable<Role[]>;
    };
}

export interface OptionalOptions {
    authentication: {
        /**
         * The path to the authentication endpoint, defaults to `/authenticate`.
         */
        path: string;
        /**
         * The HTTP method to be used on the authentication endpoint, defaults to `POST`.
         */
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        /**
         * The JWT expiration time span, in **seconds**, defaults to `3600`, or 1 hour.
         */
        expirationTimeSpan: number;
    };
}

export type FilledOptions = RequiredOptions & OptionalOptions;

type Options = RequiredOptions & DeepPartial<OptionalOptions>;

export default Options;
