import { Request, Response, NextFunction } from 'express';
import Options from './src/interfaces/Options';
import parseOptions from './src/util/parseOptions';
import AuthenticationProvider from './src/services/AuthenticationProvider';
import responseError from './src/util/responseError';
import PermissionParser from './src/services/PermissionParser';
import RequestMethods from './src/interfaces/RequestMethods';
import Permission from './src/interfaces/Permission';
import Role from './src/interfaces/Role';

type InternalRequest = {
    authZ?: RequestMethods;
};

declare global {
    namespace Express {
        interface Request {
            /**
             * AuthZ permissions handler, will be truthy if the `AuthZ.globalMiddleware`
             * middleware has been added on the app request life-cycle.
             */
            readonly authZ: RequestMethods;
        }
    }
}

export default function authZ(options: Options) {
    const _options = parseOptions(options);

    async function middleware(
        request: Request,
        response: Response,
        next: NextFunction
    ) {
        const authProvider = AuthenticationProvider(
            _options,
            request,
            response
        );

        if (
            request.path === _options.authentication.path &&
            request.method.toUpperCase() ===
                _options.authentication.method.toUpperCase()
        ) {
            await authProvider.authenticate();

            return;
        }

        let userId: string;

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

        const roles = await _options.authorization.rolesProvider(userId);

        const permissionParser = PermissionParser(roles);

        const permissions = permissionParser.unwrap();

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
            }
        };

        next();
    }

    function _withPermissions(
        contextType: Permission['context'] | null = null,
        type: 'full' | 'action' = 'full'
    ) {
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

        function middlewareFactory(...permissions: string[]) {
            function middleware(
                request: Request,
                response: Response,
                next: NextFunction
            ) {
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

    return {
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
}

export { Options, Permission, Role };
