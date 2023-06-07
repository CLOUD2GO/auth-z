import fillObject from 'fill-object';
import { getMockReq, getMockRes } from '@jest-mock/express';
import AuthenticationProvider from '../src/services/AuthenticationProvider';
import { NextFunction, Request, Response } from 'express';
import { MockOptions } from './constants';
import { emptyRoles } from './constants';
import { localRoles } from './constants';
import { globalRoles } from './constants';
import PermissionParser from '../src/services/PermissionParser';
import Nullable from '../src/interfaces/Nullable';

/**
 * Type of user to be used in the tests
 */
export type User = 'local' | 'global' | 'empty';

/**
 * Represents the `AuthenticationProvider` service instance
 */
export type AuthenticationProviderInstance = ReturnType<
    typeof AuthenticationProvider
>;

/**
 * Contains the `AuthenticationProvider` service instance along with the
 * `Request` and `Response` mocks used to create it
 */
export interface AuthenticationProviderWithRequestFlow {
    authenticationProvider: AuthenticationProviderInstance;
    request: Request;
    response: Response;
}

/**
 * Represents the `options` argument that can be passed
 * to the `getServerFlow` helper function
 */
export interface ServerFlowOptions {
    user: Nullable<User>;
    path: string;
    headers: Record<string, string>;
    method: string;
}

/**
 * Default values for the `getServerFlow` helper function
 */
const defaultServerFlowOptions: ServerFlowOptions = {
    user: null,
    path: '/test',
    headers: {},
    method: 'GET'
};

/**
 * Represents the return of the `getServerFlow` helper function
 */
export interface ServerFlow {
    request: Request;
    response: Response;
    next: NextFunction;
}

/**
 * Mock function for the `Options.authorization.rolesProvider` option
 */
export function mockRolesProvider(userId: User) {
    if (userId === 'global') return globalRoles;
    if (userId === 'local') return localRoles;

    return emptyRoles;
}

/**
 * Mock function for the `Options.authentication.userIdentifier` option
 */
export function mockUserIdentifier(request: Request): Nullable<User> {
    const user = request.headers['x-user'] as User;
    return user ?? null;
}

/**
 * Get an `AuthenticationProvider` service instance with the given user.
 * If no user is provided, the `x-user` header will be omitted, acting as
 * a unauthenticated user. Useful for testing the `AuthenticationProvider.authenticate`
 * service method
 */
export function getAuthenticationProvider(
    user?: User
): AuthenticationProviderWithRequestFlow {
    /**
     * `Request` properties mock
     */
    const requestOptions = user
        ? {
              headers: {
                  'x-user': user
              }
          }
        : undefined;

    /**
     * `Request` and `Response` mocks
     */
    const mockRequest = getMockReq(requestOptions);
    const mockResponse = getMockRes().res;

    /**
     * `AuthenticationProvider` service instance along with
     * the `Request` and `Response` mocks used to create it
     */
    const data = {
        authenticationProvider: AuthenticationProvider(
            MockOptions.full,
            mockRequest,
            mockResponse
        ),
        request: mockRequest,
        response: mockResponse
    };

    return data;
}

/**
 * Get an `AuthenticationProvider` of a already authenticated user.
 * Useful for testing the `AuthenticationProvider.validate` service method
 */
export async function authenticate(
    user: User
): Promise<AuthenticationProviderInstance> {
    /**
     * Authenticated user `JWT` token
     */
    const token = await getAuthToken(user);

    /**
     * `AuthenticationProvider` service instance
     * with the authenticated user `JWT` token
     */
    const authenticationProvider = AuthenticationProvider(
        MockOptions.full,
        getMockReq({
            headers: {
                authorization: `Bearer ${token}`
            }
        }),
        getMockRes().res
    );

    return authenticationProvider;
}

/**
 * Get a `PermissionParser` service instance for the given `User`.
 * Useful for testing the `PermissionParser` service methods
 */
export function getPermissionParser(user: User) {
    /**
     * Select the roles array based on the given user
     */
    const roles =
        user === 'empty'
            ? emptyRoles
            : user === 'local'
            ? localRoles
            : globalRoles;

    /**
     * `PermissionParser` service instance
     * with the selected roles array
     */
    const permissionParser = PermissionParser(roles);

    return permissionParser;
}

/**
 *
 */
export async function getServerFlow(
    options: Partial<ServerFlowOptions> = defaultServerFlowOptions
): Promise<ServerFlow> {
    const { user, path, headers, method } = fillObject(
        options,
        defaultServerFlowOptions
    );
    const { res: response, next } = getMockRes();

    if (!user) {
        return {
            request: getMockReq({
                path,
                headers,
                method
            }),
            response,
            next
        };
    }

    const token = await getAuthToken(user);

    const request = getMockReq({
        path,
        headers: {
            authorization: `Bearer ${token}`,
            ...headers,
            method
        }
    });

    return {
        request,
        response,
        next
    };
}

/**
 * Get an authenticated user `JWT` token using the `AuthenticationProvier.authenticate`
 * service method
 */
async function getAuthToken(user: User) {
    const mockRequest = getMockReq({
        headers: {
            'x-user': user
        }
    });

    const { token } = await new Promise<{ token: string; expiresIn: number }>(
        resolve => {
            const mockResponse = {
                status(_: number) {
                    return mockResponse;
                },
                json: (data: any) => {
                    resolve(data);
                    return mockResponse;
                }
            };

            const authenticationProvider = AuthenticationProvider(
                MockOptions.full,
                mockRequest,
                mockResponse as Response
            );

            authenticationProvider.authenticate();
        }
    );

    return token;
}
