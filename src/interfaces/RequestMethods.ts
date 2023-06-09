import Permission from './Permission';
import Role from './Role';
/**
 * Object injected into the `Request.authZ` property, containing methods
 * to deal with permissions and roles
 */
interface RequestMethods {
    /**
     * Checks if the current user has the given permissions in any context.
     * Checks for fully qualified permissions, such as `Scope.Action.?Resource`
     */
    hasPermissions: (...permissions: string[]) => boolean;
    /**
     * Checks if the current user has the given permissions in the local context.
     * Checks for fully qualified permissions, such as `Scope.Action.?Resource`
     */
    hasLocalPermissions: (...localPermissions: string[]) => boolean;
    /**
     * Checks if the current user has the given permissions in the global context.
     * Checks for fully qualified permissions, such as `Scope.Action.?Resource`
     */
    hasGlobalPermissions: (...globalPermissions: string[]) => boolean;
    /**
     * Checks if the current user has the given permissions actions in any context.
     * Checks for partial permissions, such as `Scope.Action`, matching any resource, such
     * as `Scope.Action.value1`, `Scope.Action` and `Scope.Action.All`.
     */
    hasActions: (...permissionActions: string[]) => boolean;
    /**
     * Checks if the current user has the given permissions actions in the local context.
     * Checks for partial permissions, such as `Scope.Action`, matching any resource, such
     * as `Scope.Action.value1`, `Scope.Action` and `Scope.Action.All`.
     */
    hasLocalActions: (...permissionActions: string[]) => boolean;
    /**
     * Checks if the current user has the given permissions actions in the global context.
     * Checks for partial permissions, such as `Scope.Action`, matching any resource, such
     * as `Scope.Action.value1`, `Scope.Action` and `Scope.Action.All`.
     */
    hasGlobalActions: (...permissionActions: string[]) => boolean;
    /**
     * Get the current user permission context for the given permission.
     */
    getPermissionContext: (
        permission: string
    ) => Role['context'] | 'both' | 'mixed' | 'none';
    /**
     * Get a **copy** of the current user roles.
     */
    getRoles: () => Role[];
    /**
     * Get a **copy** of the current user permissions.
     */
    getPermissions: () => Permission[];
    /**
     * Get a **copy** of the current user permissions in the local context.
     */
    getLocalPermissions: () => Permission[];
    /**
     * Get a **copy** of the current user permissions in the global context.
     */
    getGlobalPermissions: () => Permission[];
    /**
     * Get the current user identifier.
     */
    getUserIdentifier: () => string;
}

export default RequestMethods;
