import { getMockReq, getMockRes } from '@jest-mock/express';
import AuthenticationProvider from '../src/services/AuthenticationProvider';
import { Response } from 'express';
import { MockOptions } from './constants';
import { emptyRoles } from './constants';
import { localRoles } from './constants';
import { globalRoles } from './constants';
import PermissionParser from '../src/services/PermissionParser';

type User = 'local' | 'global' | 'empty';

export function getAuthenticationProvider(user?: User) {
    const requestOptions = user
        ? {
              headers: {
                  'x-user': user
              }
          }
        : undefined;

    const mockRequest = getMockReq(requestOptions);

    const mockResponse = getMockRes().res;

    return {
        authenticationProvider: AuthenticationProvider(
            MockOptions.full,
            mockRequest,
            mockResponse
        ),
        request: mockRequest,
        response: mockResponse
    };
}

export async function authenticate(user: User) {
    const mockRequest = getMockReq({
        headers: {
            'x-user': user
        }
    });

    const { token } = await new Promise<{ token: string; expiresIn: number }>(
        resolve => {
            const mockResponse = {
                status(code: number) {
                    return mockResponse;
                },
                json: (data: any) => {
                    resolve(data);
                    return mockResponse;
                }
            };

            const authenticationProvider = AuthenticationProvider(
                MockOptions.full,
                mockRequest,
                mockResponse as Response
            );

            authenticationProvider.authenticate();
        }
    );

    const authenticationProvider = AuthenticationProvider(
        MockOptions.full,
        getMockReq({
            headers: {
                authorization: `Bearer ${token}`
            }
        }),
        getMockRes().res
    );

    return authenticationProvider;
}

export function getPermissionParser(user: User) {
    const roles =
        user === 'empty'
            ? emptyRoles
            : user === 'local'
            ? localRoles
            : globalRoles;

    const permissionParser = PermissionParser(roles);

    return permissionParser;
}
