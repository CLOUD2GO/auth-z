import { Request } from 'express';
import Awaitable from './Awaitable';
import { DeepPartial } from './DeepProp';
import Role from './Role';

export interface RequiredOptions {
    /**
     * A function that returns a **user unique identifier**, agnostic to authentication method or
     * information. This identifier will be used to generate the JWT for further requests.
     */
    userIdentifier: (request: Request) => Awaitable<string>;
    /**
     * Details for the JWT authentication.
     */
    authentication: {
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
    /**
     * The path to the authentication endpoint, defaults to `/authenticate`.
     */
    authenticationPath: string;
    authentication: {
        /**
         * The JWT expiration time span, in **seconds**, defaults to `3600`, or 1 hour.
         */
        expirationTimeSpan: number;
        /**
         * If the authentication response should include the user identifier, defaults to `false`.
         */
        returnIdentifier: boolean;
    }
};

export type FilledOptions = RequiredOptions & OptionalOptions;

type Options = RequiredOptions & DeepPartial<OptionalOptions>;

export default Options;