import Permission from '../interfaces/Permission';
import Role from '../interfaces/Role';
import constants from '../util/constants';

export type PermissionsHandler = ReturnType<typeof PermissionParser>;

type PermissionContext = Permission['context'];
type PermissionScope = string;
type PermissionAction = (typeof constants.authorization.actions)[number];
type InternalPermissionAction = Exclude<PermissionAction, 'ReadWrite'>;
type PermissionResource = Exclude<Permission['resources'], string[]> | string;

type PermissionBlock = {
    [action in InternalPermissionAction]: Permission['resources'];
};

export default function PermissionParser(roles: Role[]) {
    const permissions = new Map<string, PermissionBlock>();

    _populate();

    function _key(context: string, scope: string) {
        return `${context}${constants.authorization.keyGeneration.glue}${scope}`;
    }

    function _unKey(key: string): [PermissionContext, PermissionScope] {
        const [context, scope] = key.split(
            constants.authorization.keyGeneration.glue
        );

        return [context as PermissionContext, scope as PermissionScope];
    }

    function _parsePermission(
        permissionString: string
    ): [PermissionScope, PermissionAction | 'ReadWrite', PermissionResource] {
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

                const currentPermission: PermissionBlock = permissions.get(
                    key
                ) ?? {
                    Read: [],
                    Write: []
                };

                const _actions: InternalPermissionAction[] =
                    action === 'ReadWrite' ? ['Read', 'Write'] : [action];

                if (!constants.authorization.actions.includes(action)) continue;

                if (
                    resource === constants.authorization.resources.all ||
                    resource === constants.authorization.resources.default
                ) {
                    _actions.forEach(
                        action => (currentPermission[action] = resource)
                    );
                } else {
                    _actions.forEach(
                        action =>
                            Array.isArray(currentPermission[action]) &&
                            (currentPermission[action] as string[]).push(
                                resource
                            )
                    );
                }

                permissions.set(key, currentPermission);
            }

            for (const permission of permissions.values()) {
                for (const action in permission) {
                    const _key = action as InternalPermissionAction;

                    if (Array.isArray(permission[_key])) {
                        if (
                            permission[_key].includes(
                                constants.authorization.resources.all
                            )
                        ) {
                            permission[_key] =
                                constants.authorization.resources.all;
                        } else if (
                            permission[_key].length > 0 &&
                            (permission[_key] as string[]).every(
                                resource =>
                                    resource ===
                                    constants.authorization.resources.default
                            )
                        ) {
                            permission[_key] =
                                constants.authorization.resources.default;
                        }
                    }
                }
            }
        }
    }

    function _collapse(key: string, block: PermissionBlock): Permission[] {
        const [context, scope] = _unKey(key);

        if (equals(block.Read, block.Write))
            return single(true, true, block.Read);

        const permissions: Permission[] = [];

        if (!equals(block.Read, constants.authorization.resources.empty)) {
            permissions.push(
                single(true, includes(block.Write, block.Read), block.Read)[0]
            );
        }

        if (!equals(block.Write, constants.authorization.resources.empty)) {
            permissions.push(
                single(includes(block.Read, block.Write), true, block.Write)[0]
            );
        }

        return permissions;

        function single(
            read: boolean,
            write: boolean,
            resources: Permission['resources']
        ): Permission[] {
            return [
                {
                    context,
                    scope,
                    action: {
                        read,
                        write
                    },
                    resources
                }
            ];
        }

        function equals(
            a: Permission['resources'],
            b: Permission['resources']
        ): boolean {
            if (typeof a === typeof b && typeof a === 'string' && a === b)
                return true;

            if (
                Array.isArray(a) &&
                Array.isArray(b) &&
                a.length === b.length &&
                b.every(item => a.includes(item))
            )
                return true;

            return false;
        }

        function includes(
            block: Permission['resources'],
            toTest: Permission['resources']
        ): boolean {
            if (
                block === constants.authorization.resources.all ||
                block === constants.authorization.resources.default
            )
                return true;

            if (Array.isArray(block)) {
                if (Array.isArray(toTest)) {
                    return toTest.every(resource => block.includes(resource));
                }

                return block.includes(toTest);
            }

            return false;
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

        // If action == ReadWrite, replace to Read and Write
        const actions: InternalPermissionAction[] =
            action === 'ReadWrite' ? ['Read', 'Write'] : [action];

        for (const action of actions) {
            // Permission exists and allows all resources
            if (permission[action] === constants.authorization.resources.all)
                continue;

            // Permission exists and does not require resources (default resource)
            if (
                permission[action] === constants.authorization.resources.default
            )
                continue;

            // Permission exists and have a list of resources in which includes the requested resource
            if (
                Array.isArray(permission[action]) &&
                (permission[action] as string[]).includes(resource)
            )
                continue;

            return false;
        }

        return true;
    }

    function _checkAction(
        scope: PermissionScope,
        action: PermissionAction,
        context: Permission['context']
    ) {
        const key = _key(context, scope);

        if (!permissions.has(key)) return false;

        const permission = permissions.get(key)!;

        // If action == ReadWrite, replace to Read and Write
        const actions: InternalPermissionAction[] =
            action === 'ReadWrite' ? ['Read', 'Write'] : [action];

        for (const action of actions) {
            // Permission exists and allows all resources
            if (permission[action] === constants.authorization.resources.all)
                continue;

            // Permission exists and does not require resources (default resource)
            if (
                permission[action] === constants.authorization.resources.default
            )
                continue;

            // Permission exists and have a non-empty list of resources
            if (
                Array.isArray(permission[action]) &&
                (permission[action] as string[]).length > 0
            )
                continue;

            return false;
        }

        return true;
    }

    function unwrap(): Permission[] {
        if (!permissions.size) return [];

        const permissionsArray: Permission[] = Array.from(permissions).flatMap(
            ([key, block]) => _collapse(key, block)
        );

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
