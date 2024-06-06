import type Role from './Role.js';
import type constants from '../util/constants.js';

/**
 * Default resource applied to a permission when no resource is specified,
 * for example: `User.ReadWrite` will resolve to `User.ReadWrite.<DefaultResource>`
 */
export type DefaultResource = typeof constants.authorization.resources.default;
/**
 * The resource string that represents a wildcard for all resources,
 * for example: `User.ReadWrite.<AllResources>` will match `User.ReadWrite.Admin`
 * and `User.ReadWrite.Reader`
 */
export type AllResources = typeof constants.authorization.resources.all;

/**
 * Represents a role permission, which is used to define the allowed actions
 */
interface Permission {
    /**
     * The context of the permission, same as the role context,
     * can be `global` or `local`
     */
    context: Role['context'];
    /**
     * The scope of the permission, for example: In `User.ReadWrite.All`,
     * the scope is `User`
     */
    scope: string;
    /**
     * The action capabilities of the permission, for example: In `User.Read.All`,
     * the action will be `{ read: true, write: false }`
     */
    action: {
        /**
         * Whether the permission allows reading
         */
        read: boolean;
        /**
         * Whether the permission allows writing
         */
        write: boolean;
    };
    /**
     * The resources that the permission applies to, for example: In `User.ReadWrite.All`,
     * the permission can affect any resource, but in `User.ReadWrite.Admin`, the permission
     * only applies to the `Admin` resource. The default resource is used when no resources
     * are defined in the permission, for example: `User.ReadWrite` will resolve to
     * `User.ReadWrite.<DefaultResource>`
     */
    resources: string[] | AllResources | DefaultResource;
}

export default Permission;
