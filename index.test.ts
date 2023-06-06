import { test, expect, describe } from '@jest/globals';

import authZ, { Permission } from './index';
import {
    MockOptions,
    emptyPermissions,
    globalPermissions,
    localPermissions
} from './tests/constants';
import {
    authenticate,
    getAuthenticationProvider,
    getPermissionParser
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

        expect(permissions).toStrictEqual(emptyPermissions);
    });

    test('Permissions of a local user', () => {
        const permissionParser = getPermissionParser('local');

        const permissions = permissionParser.unwrap();

        expect(permissions).toStrictEqual(localPermissions);
    });

    test('Permissions of a global user', () => {
        const permissionParser = getPermissionParser('global');

        const permissions = permissionParser.unwrap();

        expect(permissions).toStrictEqual(globalPermissions);
    });
});
