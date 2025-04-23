import constants from '../util/constants.js';

import type Permission from '../interfaces/Permission.js';
import type Role from '../interfaces/Role.js';

/**
 * The instance of an `PermissionParser`, used to handle permissions across the application
 */
export type PermissionsHandler = ReturnType<typeof PermissionParser>;

/**
 * The allowed contexts a permission can act on
 */
type PermissionContext = Permission['context'];
/**
 * The allowed scopes a permission can act on
 */
type PermissionScope = string;
/**
 * The allowed actions a permission can act on
 */
type PermissionAction =
    (typeof constants.authorization.actions.allowedValues)[number];

/**
 * The allowed actions a permission can internally act on, excluding the `ReadWrite` action
 */
type InternalPermissionAction = Exclude<PermissionAction, 'ReadWrite'>;

/**
 * The allowed resources a permission can act on
 */
type PermissionResource = Exclude<Permission['resources'], string[]> | string;

type PermissionBlock = {
    [action in InternalPermissionAction]: Permission['resources'];
};

/**
 * A Service to handle permissions across the application, dealing with checks and
 * parsing of permissions
 * @param roles The roles given to a user
 * @returns A `PermissionsHandler` object that contains methods to check and parse permissions
 * @typeParam TUserIdentifier The type of the user identifier
 */
export default function PermissionParser(roles: Role[]) {
    const permissions = new Map<string, PermissionBlock>();

    _populate();

    /**
     * Create a unique string identifier given a context and a scope
     * @param context The context of the permission
     * @param scope The scope of the permission
     * @returns
     */
    function _key(context: PermissionContext, scope: string): string {
        return `${context}${constants.authorization.keyGeneration.glue}${scope}`;
    }

    /**
     * Return the context and scope of a permission given a unique string identifier
     * @param key The unique string identifier of the permission
     * @returns The context and scope of the permission
     */
    function _unKey(key: string): [PermissionContext, PermissionScope] {
        const [context, scope] = key.split(
            constants.authorization.keyGeneration.glue
        );

        return [context as PermissionContext, scope as PermissionScope];
    }

    /**
     * Converts a permission string (e.g `scope.action.resource`) into a tuple
     * containing the scope, action and resource
     * @param permissionString The permission string to parse
     * @returns A tuple containing the scope, action and resource
     */
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

    /**
     * Populates the internal `permissions` map with the permissions given to a user
     * by the roles.
     */
    function _populate() {
        // No roles, no permissions
        if (!roles.length) return;

        // Iterate over the roles and populate the permissions map
        for (const role of roles) {
            const changedPermissions = new Set<string>();

            // Each permission string (e.g `scope.action.resource`) is parsed
            for (const permissionString of role.permissions) {
                const { context } = role;

                const [
                    scope,
                    action,
                    resource = constants.authorization.resources.default
                ] = _parsePermission(permissionString);

                const key = _key(context, scope);

                // If the permission already exists, update it, if not, create a new entry
                const currentPermission: PermissionBlock = permissions.get(
                    key
                ) ?? {
                    Read: [],
                    Write: []
                };

                // If the action is ReadWrite, replace it with Read and Write
                const _actions: InternalPermissionAction[] =
                    action === 'ReadWrite' ? ['Read', 'Write'] : [action];

                // If the action is not allowed, skip the permission entirely
                if (
                    !constants.authorization.actions.allowedValues.includes(
                        action
                    )
                )
                    continue;

                // If the resource is `<default>` or `<all>`, set all the actions to the resource
                if (
                    resource === constants.authorization.resources.all ||
                    resource === constants.authorization.resources.default
                ) {
                    _actions.forEach(
                        action => (currentPermission[action] = resource)
                    );
                    // If resource is specific, add it to the list of resources (if the action is not already set to `<all>` or `<default>`)
                } else {
                    _actions.forEach(
                        action =>
                            Array.isArray(currentPermission[action]) &&
                            (currentPermission[action] as string[]).push(
                                resource
                            )
                    );
                }

                // Update de permisssions map with the new permission
                permissions.set(key, currentPermission);
                changedPermissions.add(key);
            }

            // Iterate over the permissions and optimize them, this is done after each role to avoid extra computing in the next role iteration
            for (const permissionKey of changedPermissions) {
                const permission = permissions.get(permissionKey)!;

                // Iterate over the actions and optimize them
                for (const action in permission) {
                    const _key = action as InternalPermissionAction;

                    // If the permission has a list of resources, check possibility of optimization
                    if (Array.isArray(permission[_key])) {
                        // If some of the resources is `<all>`, set all the action to `<all>`
                        if (
                            permission[_key].includes(
                                constants.authorization.resources.all
                            )
                        ) {
                            permission[_key] =
                                constants.authorization.resources.all;
                            // If all the resources are `<default>`, set all the action to `<default>`
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

            changedPermissions.clear();
        }
    }

    /**
     * Collapse a permission key and block into a list of permissions
     * @param key The unique string identifier of the permission, containing the context and scope
     * @param block The permission block to collapse, containing the actions and resources
     * @returns A list of permissions
     */
    function _collapse(key: string, block: PermissionBlock): Permission[] {
        const [context, scope] = _unKey(key);

        // If the resources are the same, return a single permission
        if (equals(block.Read, block.Write))
            return single(true, true, block.Read);

        const permissions: Permission[] = [];

        // `Read` action is not empty
        if (!equals(block.Read, constants.authorization.resources.empty)) {
            // Add the read action
            permissions.push(
                single(true, includes(block.Write, block.Read), block.Read)[0]
            );
        }

        // `Write` action is not empty
        if (!equals(block.Write, constants.authorization.resources.empty)) {
            permissions.push(
                single(includes(block.Read, block.Write), true, block.Write)[0]
            );
        }

        return permissions;

        /**
         * Create a permission array with a single permission object
         * @param read If the permission has the action of `<read>`
         * @param write If the permission has the action of `<write>`
         * @param resources The resources of the permission
         * @returns A list of permissions
         */
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

        /**
         * Check if two resources are equal
         * @param a The first resource
         * @param b The second resource
         * @returns `true` if the resources are equal, `false` otherwise
         */
        function equals(
            a: Permission['resources'],
            b: Permission['resources']
        ): boolean {
            // If both are strings and equal, return true
            if (typeof a === typeof b && typeof a === 'string' && a === b)
                return true;

            // If both are arrays with the same length and all items are equal (ordering does not matter), return true
            if (
                Array.isArray(a) &&
                Array.isArray(b) &&
                a.length === b.length &&
                b.every(item => a.includes(item))
            )
                return true;

            return false;
        }

        /**
         * Check if a resource block is included in a reference resource
         * @param toBeTested The resource to be tested
         * @param reference The resource to be the reference
         * @returns `true` if the resource is included, `false` otherwise
         */
        function includes(
            toBeTested: Permission['resources'],
            reference: Permission['resources']
        ): boolean {
            // If the tested block is `<all>` or `<default>`, return true
            if (
                toBeTested === constants.authorization.resources.all ||
                toBeTested === constants.authorization.resources.default
            )
                return true;

            // If the the reference is `<all>` or `<default>`, return false, as the tested block is not `<all>` or `<default>`
            if (
                reference === constants.authorization.resources.all ||
                reference === constants.authorization.resources.default
            )
                return false;

            // If the tested block have every resource in the reference block, return true
            return reference.every(resource => toBeTested.includes(resource));
        }
    }

    /**
     * Check if a permission exists in the permissions map
     * @param scope The scope of the permission
     * @param action The action of the permission
     * @param resource The resource of the permission
     * @param context The context of the permission
     * @returns `true` if the permission exists, `false` otherwise
     */
    function _check(
        scope: PermissionScope,
        action: PermissionAction,
        resource: PermissionResource,
        context: Permission['context']
    ): boolean {
        const key = _key(context, scope);

        // If the permission does not exist, return false
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

    /**
     * Check if a permission action exists in the permissions map
     * @param scope The scope of the permission
     * @param action The action of the permission
     * @param context The context of the permission
     * @returns `true` if the permission action exists, `false` otherwise
     */
    function _checkAction(
        scope: PermissionScope,
        action: PermissionAction,
        context: Permission['context']
    ): boolean {
        const key = _key(context, scope);

        // If the permission does not exist, return false
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

    /**
     * Unwraps the permissions map into a list of permissions, regardless of the roles
     * @returns A list of permissions
     */
    function unwrap(): Permission[] {
        if (!permissions.size) return [];

        const permissionsArray: Permission[] = Array.from(permissions).flatMap(
            ([key, block]) => _collapse(key, block)
        );

        return permissionsArray;
    }

    /**
     * Check if the current user has a permission in the local context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission exists, `false` otherwise
     */
    function checkLocal(permissionString: string): boolean {
        const [scope, action, resource] = _parsePermission(permissionString);

        return _check(scope, action, resource, 'local');
    }

    /**
     * Check if the current user has a permission in the global context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission exists, `false` otherwise
     */
    function checkGlobal(permissionString: string): boolean {
        const [scope, action, resource] = _parsePermission(permissionString);

        return _check(scope, action, resource, 'global');
    }

    /**
     * Check if the current user has a permission in the local or global context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission exists, `false` otherwise
     */
    function check(permissionString: string) {
        const [scope, action, resource] = _parsePermission(permissionString);

        return (
            _check(scope, action, resource, 'local') ||
            _check(scope, action, resource, 'global')
        );
    }

    /**
     * Check if the current user has a permission action in the local context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission action exists, `false` otherwise
     */
    function checkActionLocal(permissionString: string): boolean {
        const [scope, action] = _parsePermission(permissionString);

        return _checkAction(scope, action, 'local');
    }

    /**
     * Check if the current user has a permission action in the global context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission action exists, `false` otherwise
     */
    function checkActionGlobal(permissionString: string): boolean {
        const [scope, action] = _parsePermission(permissionString);

        return _checkAction(scope, action, 'global');
    }

    /**
     * Check if the current user has a permission action in the local or global context
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `true` if the permission action exists, `false` otherwise
     */
    function checkAction(permissionString: string): boolean {
        const [scope, action] = _parsePermission(permissionString);

        return (
            _checkAction(scope, action, 'local') ||
            _checkAction(scope, action, 'global')
        );
    }

    /**
     * Check if the current user has a permission context in the local or global context, both or none
     * @param permissionString The permission string to check (e.g `scope.action.resource`)
     * @returns `local`, `global`, `both` or `none`
     */
    function checkContext(
        permissionString: string
    ): Permission['context'] | 'both' | 'none' {
        const [scope] = _parsePermission(permissionString);

        const hasLocal = permissions.has(_key('local', scope));
        const hasGlobal = permissions.has(_key('global', scope));

        if (hasLocal && hasGlobal) return 'both';
        if (hasLocal) return 'local';
        if (hasGlobal) return 'global';

        return 'none';
    }

    return {
        /**
         * Unwraps the permissions map into a list of permissions, regardless of the roles
         * @returns A list of permissions
         */
        unwrap,
        /**
         * Check if the current user has a permission in the local or global context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission exists, `false` otherwise
         */
        check,
        /**
         * Check if the current user has a permission in the local context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission exists, `false` otherwise
         */
        checkLocal,
        /**
         * Check if the current user has a permission in the global context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission exists, `false` otherwise
         */
        checkGlobal,
        /**
         * Check if the current user has a permission action in the local or global context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission action exists, `false` otherwise
         */
        checkAction,
        /**
         * Check if the current user has a permission action in the local context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission action exists, `false` otherwise
         */
        checkActionLocal,
        /**
         * Check if the current user has a permission action in the global context
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `true` if the permission action exists, `false` otherwise
         */
        checkActionGlobal,
        /**
         * Check if the current user has a permission context in the local or global context, both or none
         * @param permissionString The permission string to check (e.g `scope.action.resource`)
         * @returns `local`, `global`, `both` or `none`
         */
        checkContext
    };
}
