import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { FilledOptions } from '../interfaces/Options';
import constants from '../util/constants';
import { millisFromNow, seconds, toSeconds } from '../util/time';
import responseError from '../util/responseError';

export default function (
    options: FilledOptions,
    request: Request,
    response: Response
) {
    async function authenticate() {
        const userId = await options.userIdentifier(request);

        const expiresIn = toSeconds(
            millisFromNow(seconds(options.authentication.expirationTimeSpan))
        );

        const tokenString = jwt.sign(userId, options.authentication.secret, {
            expiresIn,
            issuer: constants.authentication.jwtIssuer,
            audience: constants.authentication.jwtAudience,
            subject: constants.authentication.jwtSubject
        });

        const result: Record<string, string | number | boolean> = {
            token: tokenString,
            expiresIn
        };

        response.json(result);
    }

    function validate(): string {
        const { authorization } = request.headers;

        if (!authorization) throw new Error('Missing authorization header');

        const [type, token] = authorization.split(' ');

        if (type !== 'Bearer') throw new Error('Invalid authorization type');

        const userId = jwt.verify(token, options.authentication.secret, {
            audience: constants.authentication.jwtAudience,
            issuer: constants.authentication.jwtIssuer
        }) as string;

        return userId;
    }

    return {
        authenticate,
        validate
    };
}
