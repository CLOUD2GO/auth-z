import jwt from 'jsonwebtoken';
import responseError from '../util/responseError.js';
import constants from '../util/constants.js';

import type { Request, Response } from 'express';
import type Nullable from '../interfaces/Nullable.js';
import type { FilledOptions } from '../interfaces/Options.js';
/**
 * The authentication provider service, used to manage `JWT` authentication
 * within the application. It provides resources to authenticate and validate
 * an authenticated user
 */
export default function AuthenticationProvider<TUserIdentifier>(
    options: FilledOptions<TUserIdentifier>,
    request: Request,
    response: Response
) {
    /**
     * Authenticate method, used when a unauthenticated user starts a
     * authentication flow, or for token regeneration
     */
    async function authenticate() {
        if (!options.authentication.secret)
            throw new Error('Authentication secret must be set');

        let userId: Nullable<TUserIdentifier>;

        /**
         * Get the user identifier from the request, this can be a username,
         * email, or any other unique identifier controlled by the application.
         * It's uniqueness and validity is not validated by the library, and
         * is a responsibility of the application
         */
        try {
            userId = await options.authentication.userIdentifier(request);
        } catch (err) {
            /**
             * If an error occurs during the user identifier retrieval, the
             * authentication flow should be aborted, and the error should be
             * returned to the user
             */
            response
                .status(401)
                .json(responseError(`Invalid user: ${(err as Error).message}`));

            return;
        }

        /**
         * If the `userId` returns `null`, it means that the used could not be
         * identified, and the authentication flow should be aborted
         */
        if (userId === null) {
            response.status(401).json(responseError('Invalid user'));

            return;
        }

        /**
         * Calculation of the expiration time of the token, in whole seconds
         */
        const expiresIn = Math.round(
            options.authentication.expirationTimeSpan ||
                constants.defaultOptions.authentication.expirationTimeSpan
        );

        /**
         * The `JWT` token string, used for further authentication within the
         * application
         */
        const tokenString = jwt.sign(
            { userId },
            options.authentication.secret,
            {
                expiresIn,
                issuer: constants.authentication.jwtIssuer,
                audience: constants.authentication.jwtAudience,
                subject: constants.authentication.jwtSubject
            }
        );

        /**
         * The final response to the unauthorized request, containing the
         * `JWT` token string and the expiration time in seconds
         */
        const result: Record<string, string | number | boolean> = {
            token: tokenString,
            expiresIn
        };

        response.json(result);
    }

    /**
     * Authentication validation method, used when a authenticated user
     * makes a request to the application
     */
    function validate(): TUserIdentifier {
        /**
         * Get the `Authorization` header from the request, which should
         * contain the `JWT` token string
         */
        const { authorization } = request.headers;

        if (!authorization) throw new Error('Missing authorization header');

        const [type, token] = authorization.split(' ');

        if (type !== 'Bearer') throw new Error('Invalid authorization type');

        /**
         * Get the user identifier from the `JWT` token string, which is
         * used to identify the user roles within the application by the
         * `PermissionParser` service
         */
        const { userId } = jwt.verify(token, options.authentication.secret, {
            audience: constants.authentication.jwtAudience,
            issuer: constants.authentication.jwtIssuer
        }) as { userId: TUserIdentifier };

        return userId;
    }

    return {
        authenticate,
        validate
    };
}
