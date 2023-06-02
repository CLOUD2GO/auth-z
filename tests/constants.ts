import { Options } from '../index';
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

export const localRoles: Role[] = [
    {
        context: 'local',
        id: 'LOCAL',
        name: 'Local role',
        description: 'Local role',
        permissions: ['User.ReadWrite.All', 'Report.ReadWrite.All']
    }
];

export const emptyRoles: Role[] = [];

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
            secret: authenticationSecret
        },
        authorization: {
            rolesProvider: mockRolesProvider
        },
        userIdentifier: mockUserIdentifier
    } as Options,

    full: {
        authentication: {
            secret: authenticationSecret,
            expirationTimeSpan: 3600
        },
        authorization: {
            rolesProvider: mockRolesProvider
        },
        userIdentifier: mockUserIdentifier,
        authenticationPath: '/authenticate'
    } as FilledOptions,

    invalid: {} as Options
} as const;
