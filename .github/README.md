# auth-z

![](assets/logo.svg)

Authorization package with complex permission handling

## Why?

Sometimes managing permissions of an application can be difficult. This package aims to leverage the complexity of permissions by providing a simple interface to manage them.

You still have the control of which actions, resources and scopes are allowed, but now with a simple `app.use` you can lock everything behind authentication and check if the user has the required permissions on any controller, or using a permission-specific middleware on a route basis.

For a full working example, check out [this repository]().

## Installation

Install this package on your [`express`](https://expressjs.com) project:

```bash
npm install @cloud2go/auth-z
```

## Usage

### Types

The package uses internally some helper types:

```ts
/**
 * Represents a value that can be `null`
 */
type Nullable<T> = T | null;

/**
 * Represents the return type of a function that can be `sync` or `async`
 */
type Awaitable<T = void> = T | Promise<T>;

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
```

Also, some interfaces are exported for convenience, as they are returned by some of the package methods:

```ts
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
```

### Importing and configuration

Import the package and configure it with your `express` app:

**Importing:**

```js
// ES Modules
import AuthZ from '@cloud2go/auth-z';

// Common JS
const AuthZ = require('@cloud2go/auth-z').default;
```

**Configuration:**

The configuration object uses the following interface:

```ts
/**
 * Represents the options to create an `AuthZ` instance
 */
export interface Options {
    /**
     * Details for the JWT authentication.
     */
    authentication: {
        /**
         * A function that returns a **user unique identifier**, agnostic to authentication method or
         * information. This identifier will be used to generate the JWT for further requests.
         */
        userIdentifier: (request: Request) => Awaitable<string | null>;
        /**
         * The JWT signing secret, this value is considered the password of the application,
         * and should not be publicly available.
         */
        secret: string;
        /**
         * The path to the authentication endpoint, defaults to `/authenticate`.
         */
        path?: string;
        /**
         * The HTTP method to be used on the authentication endpoint, defaults to `POST`.
         */
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        /**
         * The JWT expiration time span, in **seconds**, defaults to `3600`, or 1 hour.
         */
        expirationTimeSpan?: number;
    };
    authorization: {
        /**
         * A function that returns the roles of a given user, identified by the `userIdentifier` callback.
         */
        rolesProvider: (userId: string) => Awaitable<Role[]>;
    };
}
```

**Example:**

```js
const authZ = AuthZ({
    authentication: {
        userIdentifier(request) {
            return request.headers['x-user'] ?? null;
        },
        secret: process.env.MY_API_SECRET
    },
    authorization: {
        rolesProvider(userId) {
            return getRolesFromDatabase(userId);
        }
    }
});
```

### Global authentication

To use the package within your application you **MUST** add the global middleware:

```js
import express from 'express';
import AuthZ from '@cloud2go/auth-z';

const app = express();

const authZ = AuthZ(...configuration);

app.use(authZ.middleware);
```

After that, all requests require authentication, and authorization can be set in a case-by-case basis.

### `Request.authZ` property

Every request will now have a `authZ` property, with the following interface:

```ts
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
```

### Authorization middlewares

The package provides a set of middlewares to check for permissions in a route basis:

```js
authZ.withPermissions(...permissions); // Middleware to check if the user has the specified permissions on a route
authZ.withGlobalPermissions(...globalPermissions); // Middleware to check if the user has the specified global permissions on a route
authZ.withLocalPermissions(...localPermissions); // Middleware to check if the user has the specified local permissions on a route
authZ.withActions(...permissionActions); // Middleware to check if the user has the specified permission actions on a route
authZ.withGlobalActions(...globalPermissionActions); // Middleware to check if the user has the specified global permission actions on a route
authZ.withLocalActions(...localPermissionActions); // Middleware to check if the user has the specified local permission actions on a route
```
