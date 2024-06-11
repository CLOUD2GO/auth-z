import type { Request } from 'express';
import type Awaitable from './Awaitable.js';
import type Nullable from './Nullable.js';
import type { DeepPartial } from './DeepProp.js';
import type Role from './Role.js';
import type HttpMethod from './HttpMethod.js';
/**
 * Represents the required part of the options to create an `AuthZ` instance
 */
export interface RequiredOptions<TUserIdentifier = string> {
    /**
     * Details for the JWT authentication.
     */
    authentication: {
        /**
         * A function that returns a **user unique identifier**, agnostic to authentication method or
         * information. This identifier will be used to generate the JWT for further requests. If the user
         * is `null`, the authentication request will be aborted with a `401` error response. Any errors
         * thrown by this function will be returned to the user as a `401` error with the error message
         * within the response body.
         */
        userIdentifier: (
            request: Request
        ) => Awaitable<Nullable<TUserIdentifier>>;
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
        rolesProvider: (userId: TUserIdentifier) => Awaitable<Role[]>;
    };
}
/**
 * Represents the optional part of the options to create an `AuthZ` instance
 */
export interface OptionalOptions {
    /**
     * Details for the JWT authentication.
     */
    authentication: {
        /**
         * The path to the authentication endpoint, defaults to `/authenticate`.
         */
        path: string;
        /**
         * The HTTP method to be used on the authentication endpoint, defaults to `POST`.
         */
        method: HttpMethod;
        /**
         * The JWT expiration time span, in **seconds**, defaults to `3600`, or 1 hour.
         */
        expirationTimeSpan: number;
    };
    /**
     * Details for the user authorization.
     */
    authorization: {
        /**
         * The configuration to the IAM endpoint, which returns the user identification, it's permissions and roles.
         * If `null` the IAM endpoint will be disabled.
         */
        iamEndpoint: Nullable<{
            /**
             * The path to the IAM endpoint, defaults to `/iam`.
             */
            path: string;
            /**
             * The HTTP method to be used on the IAM endpoint, defaults to `GET`.
             */
            method: HttpMethod;
        }>;
    };
}

/**
 * Represents the options to create an `AuthZ` instance after being filled
 * with default values
 */
export type FilledOptions<T = string> = RequiredOptions<T> & OptionalOptions;

/**
 * Represents the options to create an `AuthZ` instance
 */
type Options<T = string> = RequiredOptions<T> & DeepPartial<OptionalOptions>;

export default Options;
