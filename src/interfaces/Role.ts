/**
 * Represents a `AuthZ` user role, containing information about what
 * the user can do within the application
 */
interface Role {
    /**
     * The unique identifier of the role
     */
    id: string;
    /**
     * Display name of the role
     */
    name: string;
    /**
     * Optional description of the role
     */
    description?: string;
    /**
     * Array of string representation of the permissions of the role,
     * for example: `User.ReadWrite.All`
     */
    permissions: string[];
    /**
     * The context of the role, can be `global` or `local`
     */
    context: 'global' | 'local';
}

export default Role;
