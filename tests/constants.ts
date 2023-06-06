import { Options, Permission } from '../index';
import Role from '../src/interfaces/Role';
import { FilledOptions } from '../src/interfaces/Options';
import { Request } from 'express';

const authenticationSecret = '__SECRET__';

export const globalRoles: Role[] = [
    {
        context: 'global',
        id: 'ADMIN',
        name: 'Administrator',
        description: 'Administrator role',
        permissions: ['User.ReadWrite.All', 'Report.ReadWrite.All']
    }
];

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

export const emptyRoles: Role[] = [];

export const emptyPermissions: Permission[] = [];

export function mockRolesProvider(userId: string) {
    if (userId === 'global') return globalRoles;
    if (userId === 'local') return localRoles;

    return emptyRoles;
}

export function mockUserIdentifier(request: Request): string | null {
    const user = request.headers['x-user'] as string;
    return user ?? null;
}

export const MockOptions = {
    minimal: {
        authentication: {
            secret: authenticationSecret,
            userIdentifier: mockUserIdentifier
        },
        authorization: {
            rolesProvider: mockRolesProvider
        }
    } as Options,

    full: {
        authentication: {
            secret: authenticationSecret,
            expirationTimeSpan: 3600,
            userIdentifier: mockUserIdentifier
        },
        authorization: {
            rolesProvider: mockRolesProvider
        },
        authenticationPath: '/authenticate'
    } as FilledOptions,

    invalid: {} as Options
} as const;
