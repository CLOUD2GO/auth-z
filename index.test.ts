import { test, expect, describe } from '@jest/globals';

import authZ from './index';
import {
    MockOptions,
    emptyPermissions,
    emptyRoles,
    globalPermissions,
    globalRoles,
    localPermissions,
    localRoles
} from './tests/constants';
import {
    authenticate,
    getAuthenticationProvider,
    getPermissionParser,
    getServerFlow
} from './tests/helpers';

describe('Creation of instance with different configurations', () => {
    test('Creation with minimal options', () => {
        authZ(MockOptions.minimal);
    });

    test('Creation with full options', () => {
        authZ(MockOptions.full);
    });

    test('Creation with invalid options', () => {
        expect(() => {
            authZ(MockOptions.invalid);
        }).toThrow();
    });
});

describe('`AuthenticationProvider` validations', () => {
    const successfulAuthentication = expect.objectContaining({
        token: expect.any(String),
        expiresIn: MockOptions.full.authentication.expirationTimeSpan
    });

    const failedAuthentication = {
        error: 'Invalid user'
    };

    test('Authentication on a invalid user', async () => {
        const { authenticationProvider, response } =
            getAuthenticationProvider();
        await authenticationProvider.authenticate();
        expect(response.json).toHaveBeenCalledWith(failedAuthentication);
    });

    test('Authentication on a permission-less user', async () => {
        const { authenticationProvider, response } =
            getAuthenticationProvider('empty');

        await authenticationProvider.authenticate();

        expect(response.json).toHaveBeenCalledWith(successfulAuthentication);
    });

    test('Authentication on a local user', async () => {
        const { authenticationProvider, response } =
            getAuthenticationProvider('local');

        await authenticationProvider.authenticate();

        expect(response.json).toHaveBeenCalledWith(successfulAuthentication);
    });

    test('Authentication on a global user', async () => {
        const { authenticationProvider, response } =
            getAuthenticationProvider('local');

        await authenticationProvider.authenticate();

        expect(response.json).toHaveBeenCalledWith(successfulAuthentication);
    });

    test('Identifier of a permission-less user', async () => {
        const authenticationProvider = await authenticate('empty');

        const userId = authenticationProvider.validate();

        expect(userId).toEqual('empty');
    });

    test('Identifier of a local user', async () => {
        const authenticationProvider = await authenticate('local');

        const userId = authenticationProvider.validate();

        expect(userId).toEqual('local');
    });

    test('Identifier of a global user', async () => {
        const authenticationProvider = await authenticate('global');

        const userId = authenticationProvider.validate();

        expect(userId).toEqual('global');
    });
});

describe('`PermissionParser` validations', () => {
    test('Permissions of a permission-less user', () => {
        const permissionParser = getPermissionParser('empty');

        const permissions = permissionParser.unwrap();

        expect(permissions).toEqual(emptyPermissions);
    });

    test('Permissions of a local user', () => {
        const permissionParser = getPermissionParser('local');

        const permissions = permissionParser.unwrap();

        expect(permissions).toEqual(localPermissions);
    });

    test('Permissions of a global user', () => {
        const permissionParser = getPermissionParser('global');

        const permissions = permissionParser.unwrap();

        expect(permissions).toEqual(globalPermissions);
    });

    test('Permission checking of a empty user', () => {
        const permissionParser = getPermissionParser('empty');

        expect(permissionParser.check('User.Read.All')).toBe(false);
        expect(permissionParser.checkLocal('User.Read.All')).toBe(false);
        expect(permissionParser.checkGlobal('User.Read.All')).toBe(false);
        expect(permissionParser.checkAction('User.Read')).toBe(false);
        expect(permissionParser.checkActionLocal('User.Read')).toBe(false);
        expect(permissionParser.checkActionGlobal('User.Read')).toBe(false);
    });

    test('Permission checking of a local user', () => {
        const permissionParser = getPermissionParser('local');

        expect(permissionParser.check('User.Read.All')).toBe(true);
        expect(permissionParser.checkLocal('User.Read.All')).toBe(true);
        expect(permissionParser.checkGlobal('User.Read.All')).toBe(false);
        expect(permissionParser.checkAction('User.Read')).toBe(true);
        expect(permissionParser.checkActionLocal('User.Read')).toBe(true);
        expect(permissionParser.checkActionGlobal('User.Read')).toBe(false);
    });

    test('Permission checking of a global user', () => {
        const permissionParser = getPermissionParser('global');

        expect(permissionParser.check('User.Read.All')).toBe(true);
        expect(permissionParser.checkLocal('User.Read.All')).toBe(false);
        expect(permissionParser.checkGlobal('User.Read.All')).toBe(true);
        expect(permissionParser.checkAction('User.Read')).toBe(true);
        expect(permissionParser.checkActionLocal('User.Read')).toBe(false);
        expect(permissionParser.checkActionGlobal('User.Read')).toBe(true);
    });
});

describe('`AuthZ` global middleware validations', () => {
    const instance = authZ(MockOptions.minimal);

    test('Unauthenticated user flow on authorized-only endpoint', async () => {
        const { request, response, next } = await getServerFlow();

        await instance.middleware(request, response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenLastCalledWith({
            error: 'Authentication error: Missing authorization header'
        });
    });

    test('Unauthorized user flow on `/authenticate` endpoint with invalid data', async () => {
        const { request, response, next } = await getServerFlow(
            undefined,
            '/authenticate',
            undefined,
            'POST'
        );

        await instance.middleware(request, response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenLastCalledWith({
            error: 'Invalid user'
        });
    });

    test('Unauthorized user flow on `/authenticate` endpoint with valid credentials', async () => {
        const { request, response, next } = await getServerFlow(
            undefined,
            '/authenticate',
            {
                'x-user': 'empty'
            },
            'POST'
        );

        await instance.middleware(request, response, next);

        expect(response.json).toHaveBeenLastCalledWith(
            expect.objectContaining({
                token: expect.any(String),
                expiresIn: MockOptions.full.authentication.expirationTimeSpan
            })
        );
    });

    test('Empty user flow on authorized-only endpoint', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('Local user flow on authorized-only endpoint', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('Global user flow on authorized-only endpoint', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('Empty user flow permissions check', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);

        expect(request.authZ.getPermissions()).toEqual(emptyPermissions);
        expect(request.authZ.getLocalPermissions()).toEqual(emptyPermissions);
        expect(request.authZ.getGlobalPermissions()).toEqual(emptyPermissions);
        expect(request.authZ.getRoles()).toEqual(emptyRoles);

        expect(request.authZ.hasPermissions('User.Read.All')).toBe(false);
        expect(request.authZ.hasLocalPermissions('User.Read.All')).toBe(false);
        expect(request.authZ.hasGlobalPermissions('User.Read.All')).toBe(false);
        expect(request.authZ.hasActions('User.Read')).toBe(false);
        expect(request.authZ.hasLocalActions('User.Read')).toBe(false);
        expect(request.authZ.hasGlobalActions('User.Read')).toBe(false);
    });

    test('Local user flow permissions check', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);

        expect(request.authZ.getPermissions()).toEqual(localPermissions);
        expect(request.authZ.getLocalPermissions()).toEqual(localPermissions);
        expect(request.authZ.getGlobalPermissions()).toEqual(emptyPermissions);
        expect(request.authZ.getRoles()).toEqual(localRoles);

        expect(request.authZ.hasPermissions('User.Read.All')).toBe(true);
        expect(request.authZ.hasLocalPermissions('User.Read.All')).toBe(true);
        expect(request.authZ.hasGlobalPermissions('User.Read.All')).toBe(false);
        expect(request.authZ.hasActions('User.Read')).toBe(true);
        expect(request.authZ.hasLocalActions('User.Read')).toBe(true);
        expect(request.authZ.hasGlobalActions('User.Read')).toBe(false);
    });

    test('Empty user flow permissions check', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        expect(next).toHaveBeenCalledTimes(1);

        expect(request.authZ.getPermissions()).toEqual(globalPermissions);
        expect(request.authZ.getLocalPermissions()).toEqual(emptyPermissions);
        expect(request.authZ.getGlobalPermissions()).toEqual(globalPermissions);
        expect(request.authZ.getRoles()).toEqual(globalRoles);

        expect(request.authZ.hasPermissions('User.Read.All')).toBe(true);
        expect(request.authZ.hasLocalPermissions('User.Read.All')).toBe(false);
        expect(request.authZ.hasGlobalPermissions('User.Read.All')).toBe(true);
        expect(request.authZ.hasActions('User.Read')).toBe(true);
        expect(request.authZ.hasLocalActions('User.Read')).toBe(false);
        expect(request.authZ.hasGlobalActions('User.Read')).toBe(true);
    });
});

describe('`AuthZ` independent middleware validations', () => {
    const instance = authZ(MockOptions.minimal);

    test('Empty user flow with `withActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Global user flow with `withActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Empty user flow with `withLocalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withLocalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Global user flow with `withLocalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Empty user flow with `withGlobalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withGlobalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Global user flow with `withGlobalActions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalActions('User.Read')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Empty user flow with `withPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Global user flow with `withPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Empty user flow with `withLocalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withLocalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    test('Global user flow with `withLocalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withLocalPermissions('User.Read.All')(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Empty user flow with `withGlobalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('empty');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalPermissions('User.Read.All')(
            request,
            response,
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Local user flow with `withGlobalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('local');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalPermissions('User.Read.All')(
            request,
            response,
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            error: `You don't have permissions to access this resource.`
        });
    });

    test('Global user flow with `withGlobalPermissions` middleware', async () => {
        const { request, response, next } = await getServerFlow('global');

        await instance.middleware(request, response, next);
        expect(request.authZ).toBeDefined();

        instance.withGlobalPermissions('User.Read.All')(
            request,
            response,
            next
        );

        expect(next).toHaveBeenCalledTimes(2);
    });
});
