import { Request, Response, NextFunction } from 'express';
import Options from './src/interfaces/Options';
import parseOptions from './src/util/parseOptions';
import AuthenticationProvider from './src/services/AuthenticationProvider';
import responseError from './src/util/responseError';
import PermissionParser from './src/services/PermissionParser';
import RequestMethods from './src/interfaces/RequestMethods';

type InternalRequest = {
    authZ?: RequestMethods;
};

declare global {
    namespace Express {
        interface Request {
            readonly authZ: RequestMethods;
        }
    }
}

export default function authZ(options: Options) {
    async function globalMiddleware(
        request: Request,
        response: Response,
        next: NextFunction
    ) {
        const _options = parseOptions(options);

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

            // TODO: Implement

            getPermissionContext(permission: string) {
                return 'none';
            },

            hasPermissions(...permissions) {
                return false;
            },

            hasGlobalPermissions(...globalPermissions) {
                return false;
            },

            hasLocalPermissions(...localPermissions) {
                return false;
            },

            hasActions(...permissionActions) {
                return false;
            },

            hasGlobalActions(...globalPermissionActions) {
                return false;
            },

            hasLocalActions(...localPermissionActions) {
                return false;
            }
        };

        next();
    }

    return {
        globalMiddleware
    };
}
