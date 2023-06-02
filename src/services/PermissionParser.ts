import Permission, {
    AllResources,
    AnyResource,
    DefaultResource
} from '../interfaces/Permission';
import Role from '../interfaces/Role';
import constants from '../util/constants';

export type PermissionsHandler = ReturnType<typeof PermissionParser>;

type PermissionAction = 'Read' | 'Write' | 'ReadWrite';
type PermissionResource = Exclude<Permission['resources'], string[]> | string;

export default function PermissionParser(roles: Role[]) {
    function _key(context: string, scope: string) {
        return `${context}::[${scope}]`;
    }

    function unwrap(): Permission[] {
        if (!roles.length) return [];

        const permissions: Map<string, Permission> = new Map();

        for (const role of roles) {
            for (const permissionString of role.permissions) {
                const { context } = role;

                const [
                    scope,
                    action,
                    resource = constants.authorization.resources.default
                ] = permissionString.split('.') as [
                    string,
                    PermissionAction,
                    PermissionResource
                ];

                const key = _key(context, scope);

                const currentPermission: Permission = permissions.get(key) ?? {
                    context,
                    scope,
                    action: {
                        read: false,
                        write: false
                    },
                    resources: []
                };

                switch (action) {
                    case 'Read':
                        currentPermission.action.read = true;
                        break;
                    case 'Write':
                        currentPermission.action.write = true;
                        break;
                    case 'ReadWrite':
                        currentPermission.action.read = true;
                        currentPermission.action.write = true;
                        break;
                    default:
                        // If invalid action, skip
                        continue;
                }

                (currentPermission.resources as string[]).push(resource);

                permissions.set(key, currentPermission);
            }
        }

        const permissionsArray = Array.from(permissions.values());

        for (const permission of permissionsArray) {
            if (
                permission.resources.includes(
                    constants.authorization.resources.all
                )
            ) {
                permission.resources = constants.authorization.resources.all;
                continue;
            }

            if (
                permission.resources.includes(
                    constants.authorization.resources.default
                )
            ) {
                permission.resources =
                    constants.authorization.resources.default;
                continue;
            }
        }

        return permissionsArray;
    }

    return {
        unwrap
    };
}
