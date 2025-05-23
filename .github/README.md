# auth-z

![](assets/logo.svg)

Authorization package with complex permission handling

## Why?

Sometimes managing permissions of an application can be difficult. This package aims to leverage the complexity of permissions by providing a simple interface to manage them.

You still have the control of which actions, resources and scopes are allowed, but now with a simple `app.use` you can lock everything behind authentication and check if the user has the required permissions on any controller, or using a permission-specific middleware on a route basis.

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
export interface Options<TUserIdentifier = string> {
    /**
     * Details for the JWT authentication.
     */
    authentication: {
        /**
         * A function that returns a **user unique identifier**, agnostic to authentication method or
         * information. This identifier will be used to generate the JWT for further requests. If the user
         * is `null`, the authentication request will be aborted with a `401` error response. Any errors
         * thrown by this function will be returned to the user as a `401` error with the error message
         * within the response body.
         */
        userIdentifier: (
            request: Request
        ) => Awaitable<Nullable<TUserIdentifier>>;
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
        rolesProvider: (userId: TUserIdentifier) => Awaitable<Role[]>;
        /**
         * The configuration to the IAM endpoint, which returns the user identification, it's permissions and roles.
         * If `null` the IAM endpoint will be disabled.
         */
        iamEndpoint?: Nullable<{
            /**
             * The path to the IAM endpoint, defaults to `/iam`.
             */
            path: string;
            /**
             * The HTTP method to be used on the IAM endpoint, defaults to `GET`.
             */
            method: HttpMethod;
        }>;
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

const authZ = AuthZ(configuration);

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
    ) => Role['context'] | 'both' | 'none';
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
    getUserIdentifier: <TUserIdentifier = unknown>() => TUserIdentifier;
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

## Endpoints

The library creates two endpoints, processed in the global middleware.

The first one is the **Authentication endpoint**, used to generate a valid JWT token for the client. It defaults to `POST /authenticate`, but can be changed using the `options.authentication.path` and `options.authentication.method`. The request details is defined by the user provider, being implementation-specific. The response body looks like this:

```json
{
    "token": "...",
    "expiresIn": 3600
}
```

The `token` property contains the JWT Bearer token to use in the `Authorization` header with the `Bearer ` prefix, it will allow the authenticated user to call the rest of the API endpoints. The `expiresIn` property contains how much time (in seconds) the token will live.

The second one is the **IAM endpoint**, used to return to the user the permissions, roles and the `TUserIdentifier`. It defaults to `GET /iam`, but can be changed in the `options.authorization.iamEndpoint.path` and `options.authorization.iamEndpoint.method`. This endpoint can be disabled by setting the property `options.authorization.iamEndpoint` to `null`. This request requires an authentication token and will always return, independently of the user permissions. The response body looks like this:

```json
{
    "userId": {},
    "roles": [
        {
            "context": "global",
            "id": "ADMIN",
            "name": "Global Administrator",
            "description": "Can do anything in the system",
            "permissions": ["System.ReadWrite.All"],
        }
    ],
    "permissions": [
        {
            "context": "global",
            "scope": "System",
            "action": {
                "read": true,
                "write": true
            }
            "resource": "All"
        }
    ]
}
```

The `userId` property contains the data returned by the `options.authentication.userIdentifier` function, being implementation-specific. The `roles` property contains the data returned by the `options.authorization.rolesProvider`, an array of the `Role` type. The `permissions` property contains the parsed permissions from the `roles` property, containing a more developer-friendly shape to access the data of each permission.
