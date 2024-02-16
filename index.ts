import { Request, Response, NextFunction } from 'express';
import Options from './src/interfaces/Options';
import parseOptions from './src/util/parseOptions';
import AuthenticationProvider from './src/services/AuthenticationProvider';
import responseError from './src/util/responseError';
import PermissionParser from './src/services/PermissionParser';
import RequestMethods from './src/interfaces/RequestMethods';
import Permission from './src/interfaces/Permission';
import Role from './src/interfaces/Role';
import Nullable from './src/interfaces/Nullable';

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
export default function AuthZ<TUserIndentifier = string>(
    options: Options<TUserIndentifier>
) {
    /**
     * Parsed options, with default values for missing properties
     */
    const _options = parseOptions(options);

    /**
     * Global middleware to be used on the express application, it will
     * handle the `JWT` authentication, set the `Request.authZ` property
     * and allow the use of route-specific middlewares
     */
    async function middleware(
        request: Request,
        response: Response,
        next: NextFunction
    ) {
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
         * If the request is a authentication request, the authentication
         * will be redirected to the authentication provider
         */
        if (
            request.path === _options.authentication.path &&
            request.method.toUpperCase() ===
                _options.authentication.method.toUpperCase()
        ) {
            await authProvider.authenticate();

            return;
        }

        let userId: TUserIndentifier;

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

            getUserIdentifier<TUserIndentifier = unknown>() {
                return userId as unknown as TUserIndentifier;
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
export { Options, Permission, Role, RequestMethods };
