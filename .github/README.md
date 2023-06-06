# auth-z

![](assets/logo.svg)

Authorization package with complex permission handling

## Why?

Sometimes managing permissions of an application can be difficult. This package aims to leverage the complexity of permissions by providing a simple interface to manage them.

You still have the control of which actions, resources and scopes are allowed, but now with a simple `app.use` you can lock everything behind authentication and check if the user has the required permissions on any controller, or using a permission-specific middleware on a route basis.

## Installation

Install this package on your [`express`](https://expressjs.com/pt-br/) project:

```bash
npm install @cloud2go/auth-z
```

## Usage

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
        path: string;
        /**
         * The HTTP method to be used on the authentication endpoint, defaults to `POST`.
         */
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
