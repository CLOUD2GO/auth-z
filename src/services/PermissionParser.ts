import Permission, {
    AllResources,
    AnyResource,
    DefaultResource
} from '../interfaces/Permission';
import Role from '../interfaces/Role';
import constants from '../util/constants';

export type PermissionsHandler = ReturnType<typeof PermissionParser>;

type PermissionScope = string;
type PermissionAction = 'Read' | 'Write' | 'ReadWrite';
type PermissionResource = Exclude<Permission['resources'], string[]> | string;

export default function PermissionParser(roles: Role[]) {
    const permissions = new Map<string, Permission>();

    _populate();

    function _key(context: string, scope: string) {
        return `${context}::[${scope}]`;
    }

    function _parsePermission(
        permissionString: string
    ): [PermissionScope, PermissionAction, PermissionResource] {
        const [
            scope,
            action,
            resource = constants.authorization.resources.default
        ] = permissionString.split('.');

        return [scope, action as PermissionAction, resource];
    }

    function _populate() {
        if (!roles.length) return;

        for (const role of roles) {
            for (const permissionString of role.permissions) {
                const { context } = role;

                const [
                    scope,
                    action,
                    resource = constants.authorization.resources.default
                ] = _parsePermission(permissionString);

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

            for (const permission of permissions.values()) {
                if (
                    permission.resources.includes(
                        constants.authorization.resources.all
                    )
                ) {
                    permission.resources =
                        constants.authorization.resources.all;
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
        }
    }

    function _check(
        scope: PermissionScope,
        action: PermissionAction,
        resource: PermissionResource,
        context: Permission['context']
    ) {
        const key = _key(context, scope);

        if (!permissions.has(key)) return false;

        const permission = permissions.get(key)!;

        switch (action) {
            case 'Read':
                if (!permission.action.read) return false;
                break;
            case 'Write':
                if (!permission.action.write) return false;
                break;
            case 'ReadWrite':
                if (!permission.action.read || !permission.action.write)
                    return false;
                break;
            default:
                return false;
        }

        if (permission.resources === constants.authorization.resources.all)
            return true;
        if (
            permission.resources ===
                constants.authorization.resources.default &&
            resource === constants.authorization.resources.default
        )
            return true;

        return false;
    }

    function _checkAction(
        scope: PermissionScope,
        action: PermissionAction,
        context: Permission['context']
    ) {
        const key = _key(context, scope);

        if (!permissions.has(key)) return false;

        const permission = permissions.get(key)!;

        switch (action) {
            case 'Read':
                if (!permission.action.read) return false;
                break;
            case 'Write':
                if (!permission.action.write) return false;
                break;
            case 'ReadWrite':
                if (!permission.action.read || !permission.action.write)
                    return false;
                break;
            default:
                return false;
        }

        return true;
    }

    function unwrap(): Permission[] {
        if (!permissions.size) return [];

        const permissionsArray = Array.from(permissions.values());

        return permissionsArray;
    }

    function checkLocal(permissionString: string): boolean {
        const [scope, action, resource] = _parsePermission(permissionString);

        return _check(scope, action, resource, 'local');
    }

    function checkGlobal(permissionString: string): boolean {
        const [scope, action, resource] = _parsePermission(permissionString);

        return _check(scope, action, resource, 'global');
    }

    function check(permissionString: string) {
        const [scope, action, resource] = _parsePermission(permissionString);

        return (
            _check(scope, action, resource, 'local') ||
            _check(scope, action, resource, 'global')
        );
    }

    function checkActionLocal(permissionString: string): boolean {
        const [scope, action] = _parsePermission(permissionString);

        return _checkAction(scope, action, 'local');
    }

    function checkActionGlobal(permissionString: string): boolean {
        const [scope, action] = _parsePermission(permissionString);

        return _checkAction(scope, action, 'global');
    }

    function checkAction(permissionString: string) {
        const [scope, action] = _parsePermission(permissionString);

        return (
            _checkAction(scope, action, 'local') ||
            _checkAction(scope, action, 'global')
        );
    }

    function checkContext(
        permissionString: string
    ): Permission['context'] | 'mixed' | 'none' {
        const [scope] = _parsePermission(permissionString);

        const hasLocal = permissions.has(_key('local', scope));
        const hasGlobal = permissions.has(_key('global', scope));

        if (hasLocal && hasGlobal) return 'mixed';
        if (hasLocal) return 'local';
        if (hasGlobal) return 'global';

        return 'none';
    }

    return {
        unwrap,
        check,
        checkLocal,
        checkGlobal,
        checkAction,
        checkActionLocal,
        checkActionGlobal,
        checkContext
    };
}
