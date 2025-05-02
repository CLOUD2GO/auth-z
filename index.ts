import AuthenticationProvider from './src/services/AuthenticationProvider.js';
import PermissionParser from './src/services/PermissionParser.js';
import parseOptions from './src/util/parseOptions.js';
import responseError from './src/util/responseError.js';

import type { Request, Response, NextFunction } from 'express';
import type Options from './src/interfaces/Options.js';
import type RequestMethods from './src/interfaces/RequestMethods.js';
import type Permission from './src/interfaces/Permission.js';
import type Role from './src/interfaces/Role.js';
import type Nullable from './src/interfaces/Nullable.js';
import requestKind from './src/util/requestKind.js';

/**
 * Internal type of the `Express.Request` interface, used to augment the
 * interface with the `authZ` property to allow the property to be
 * set on the global middleware
 */
type InternalRequest = {
    /**
     * AuthZ permissions handler with optional attribute to allow setting
     * the property on the global middleware
     */
    authZ?: RequestMethods;
};

/**
 * Augment the `Express.Request` interface to include the `authZ` property
 */
declare global {
    namespace Express {
        interface Request {
            /**
             * AuthZ permissions handler, will be truthy if the `AuthZ.globalMiddleware`
             * middleware has been added on the app request life-cycle using `Express.use`
             */
            readonly authZ: RequestMethods;
        }
    }
}

/**
 * `AuthZ` service creator, used to create an instance to be used within a
 * express application, allowing `JWT` authentication and complex authorization
 * handling
 */
export default function AuthZ<TUserIdentifier = string>(
    options: Options<TUserIdentifier>
) {
    /**
     * Parsed options, with default values for missing properties
     */
    const _options = parseOptions(options);

    const authenticationRequestKind = requestKind(
        _options.authentication.method,
        _options.authentication.path
    );

    const iamEndpointRequestKind =
        options.authorization.iamEndpoint !== null &&
        _options.authorization.iamEndpoint
            ? requestKind(
                  _options.authorization.iamEndpoint.method,
                  _options.authorization.iamEndpoint.path
              )
            : null;

    /**
     * Global middleware to be used on the express application, it will
     * handle the `JWT` authentication, set the `Request.authZ` property
     * and allow the use of route-specific middlewares
     */
    async function middleware(
        request: Request,
        response: Response,
        next: NextFunction
    ): Promise<void> {
        /**
         * Authentication provider, used to authenticate and validate the
         * `JWT` token within the application.
         */
        const authProvider = AuthenticationProvider(
            _options,
            request,
            response
        );

        /**
         * Request kind, used to identify the request and apply the correct
         */
        const kind = requestKind(
            request.method,
            request.baseUrl + request.path
        );

        /**
         * If the request is an authentication request, the authentication is performed
         * and the flow is stopped
         */
        if (kind === authenticationRequestKind) {
            await authProvider.authenticate();
            return;
        }

        let userId: TUserIdentifier;

        /**
         * Validate the `JWT` token, and get the user identifier from the
         * token payload
         */
        try {
            userId = authProvider.validate();
        } catch (err) {
            response
                .status(401)
                .json(
                    responseError(
                        'Authentication error: ' + (err as Error).message
                    )
                );

            return;
        }

        /**
         * Get the roles of the user, based on the user identifier.
         * It is a responsibility of the application to provide the
         * correct roles
         */
        const roles = await _options.authorization.rolesProvider(userId);

        /**
         * Parse the roles into a `Permission` array, to be used by the
         * `Request.authZ` property
         */
        const permissionParser = PermissionParser(roles);

        /**
         * Parsed `Permission` array, to be used by the `Request.authZ`
         */
        const permissions = permissionParser.unwrap();

        if (iamEndpointRequestKind && kind === iamEndpointRequestKind) {
            response.json({
                userId,
                roles,
                permissions
            });

            return;
        }

        /**
         * Set the `Request.authZ` property, containing the authorization methods
         */
        (request as InternalRequest).authZ = {
            getPermissions() {
                return structuredClone(permissions);
            },

            getGlobalPermissions() {
                return structuredClone(
                    permissions.filter(
                        permission => permission.context === 'global'
                    )
                );
            },

            getLocalPermissions() {
                return structuredClone(
                    permissions.filter(
                        permission => permission.context === 'local'
                    )
                );
            },

            getRoles() {
                return structuredClone(roles);
            },

            getPermissionContext(permission: string) {
                return permissionParser.checkContext(permission);
            },

            hasPermissions(...permissions) {
                return permissions.every(permissionParser.check);
            },

            hasGlobalPermissions(...globalPermissions) {
                return globalPermissions.every(permissionParser.checkGlobal);
            },

            hasLocalPermissions(...localPermissions) {
                return localPermissions.every(permissionParser.checkLocal);
            },

            hasActions(...permissionActions) {
                return permissionActions.every(permissionParser.checkAction);
            },

            hasGlobalActions(...globalPermissionActions) {
                return globalPermissionActions.every(
                    permissionParser.checkActionGlobal
                );
            },

            hasLocalActions(...localPermissionActions) {
                return localPermissionActions.every(
                    permissionParser.checkActionLocal
                );
            },

            getUserIdentifier<TUserIdentifier = unknown>() {
                return userId as unknown as TUserIdentifier;
            }
        };

        next();
    }

    /**
     * Middleware Factory factory, used to create a middleware factory with
     * a certain filter applied to the permissions, such as context (`local` or `global`)
     * or search type (`full` or `action`)
     */
    function _withPermissions(
        contextType: Nullable<Permission['context']> = null,
        type: 'full' | 'action' = 'full'
    ) {
        /**
         * Checker function factory, used to load the correct
         * checker function based on the type and context
         */
        function getChecker(authZ: Request['authZ']) {
            if (type === 'full') {
                if (contextType) {
                    return contextType === 'global'
                        ? authZ.hasGlobalPermissions
                        : authZ.hasLocalPermissions;
                }

                return authZ.hasPermissions;
            }

            if (type === 'action') {
                if (contextType) {
                    return contextType === 'global'
                        ? authZ.hasGlobalActions
                        : authZ.hasLocalActions;
                }

                return authZ.hasActions;
            }

            return () => false;
        }

        /**
         * Middleware factory, used to create a middleware that will check
         * based on the parameters provided to the middleware factory factory
         */
        function middlewareFactory(...permissions: string[]) {
            function middleware(
                request: Request,
                response: Response,
                next: NextFunction
            ) {
                /**
                 * Checker function, used to check if the user has the specified
                 * permissions
                 */
                const permissionChecker = getChecker(request.authZ);

                const allowed = permissionChecker(...permissions);

                if (!allowed) {
                    response
                        .status(403)
                        .json(
                            responseError(
                                `You don't have permissions to access this resource.`
                            )
                        );

                    return;
                }

                next();
            }

            return middleware;
        }

        return middlewareFactory;
    }

    /**
     * `AuthZ` instance, containing the global middleware and the middleware factories
     * for specific routes.
     */
    const instance = {
        /**
         * Global middleware, to create authentication and authorization on the application. **REQUIRED**
         */
        middleware,
        /**
         * Middleware to check if the user has the specified permissions on a route
         */
        withPermissions: _withPermissions(),
        /**
         * Middleware to check if the user has the specified global permissions on a route
         */
        withGlobalPermissions: _withPermissions('global'),
        /**
         * Middleware to check if the user has the specified local permissions on a route
         */
        withLocalPermissions: _withPermissions('local'),
        /**
         * Middleware to check if the user has the specified permission actions on a route
         */
        withActions: _withPermissions(null, 'action'),
        /**
         * Middleware to check if the user has the specified global permission actions on a route
         */
        withGlobalActions: _withPermissions('global', 'action'),
        /**
         * Middleware to check if the user has the specified local permission actions on a route
         */
        withLocalActions: _withPermissions('local', 'action')
    };

    return instance;
}

/**
 * Public interfaces exported by the library
 */
export type { Options, Permission, Role, RequestMethods };
