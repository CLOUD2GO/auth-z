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

        if (request.path === _options.authenticationPath) {
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
        middleware,
        withPermissions: _withPermissions(),
        withGlobalPermissions: _withPermissions('global'),
        withLocalPermissions: _withPermissions('local'),
        withActions: _withPermissions(null, 'action'),
        withGlobalActions: _withPermissions('global', 'action'),
        withLocalActions: _withPermissions('local', 'action')
    };
}

export { Options, Permission, Role };
