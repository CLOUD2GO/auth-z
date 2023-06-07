import { Options, Permission } from '../index';
import Role from '../src/interfaces/Role';
import { FilledOptions } from '../src/interfaces/Options';
import { mockRolesProvider, mockUserIdentifier } from './helpers';

/**
 * Mock authentication secret for `JWT` authentication
 */
const authenticationSecret = '__SECRET__';

/**
 * Mock `Role` Array with a single `Role` within the `global` context
 */
export const globalRoles: Role[] = [
    {
        context: 'global',
        id: 'ADMIN',
        name: 'Administrator',
        description: 'Administrator role',
        permissions: ['User.ReadWrite.All', 'Report.ReadWrite.All']
    }
];

/**
 * Mock `Permission` Array with ter expected parsed `Permission` array from the
 * `globalRoles` array
 */
export const globalPermissions: Permission[] = [
    {
        context: 'global',
        scope: 'User',
        action: {
            read: true,
            write: true
        },
        resources: 'All'
    },
    {
        context: 'global',
        scope: 'Report',
        action: {
            read: true,
            write: true
        },
        resources: 'All'
    }
];

/**
 * Mock `Role` Array with a single `Role` within the `local` context
 */
export const localRoles: Role[] = [
    {
        context: 'local',
        id: 'LOCAL',
        name: 'Local role',
        description: 'Local role',
        permissions: [
            'User.ReadWrite.All',
            'Report.Read.All',
            'Report.ReadWrite.someReport'
        ]
    }
];

/**
 * Mock `Permission` Array with ter expected parsed `Permission` array from the
 * `localRoles` array
 */
export const localPermissions: Permission[] = [
    {
        context: 'local',
        scope: 'User',
        action: {
            read: true,
            write: true
        },
        resources: 'All'
    },
    {
        context: 'local',
        scope: 'Report',
        action: {
            read: true,
            write: false
        },
        resources: 'All'
    },
    {
        context: 'local',
        scope: 'Report',
        action: {
            read: true,
            write: true
        },
        resources: ['someReport']
    }
];

/**
 * Mock `Role` Array with no `Role` within it, mocking a permission-less
 * user
 */
export const emptyRoles: Role[] = [];

/**
 * Mock `Permission` Array with the expected parsed `Permission` array from the
 * `emptyRoles` array
 */
export const emptyPermissions: Permission[] = [];

/**
 * Mock `Options` dictionary with different filling levels
 */
export const MockOptions = {
    /**
     * Mock `Options` object with only the required options
     */
    minimal: {
        authentication: {
            secret: authenticationSecret,
            userIdentifier: mockUserIdentifier
        },
        authorization: {
            rolesProvider: mockRolesProvider
        }
    } as Options,

    /**
     * Mock `Options` object with all the options filled
     */
    full: {
        authentication: {
            secret: authenticationSecret,
            expirationTimeSpan: 3600,
            userIdentifier: mockUserIdentifier,
            path: '/authenticate',
            method: 'POST'
        },
        authorization: {
            rolesProvider: mockRolesProvider
        }
    } as FilledOptions,

    /**
     * Mock `Options` object with no properties filled, mocking an invalid
     * `Options` object
     */
    invalid: {} as Options
} as const;
