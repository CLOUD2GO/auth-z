import fillObject from 'fill-object';
import deepCheckObject from './deepCheckObject.js';
import constants from './constants.js';

import type Options from '../interfaces/Options.js';
import type { DeepPartial } from '../interfaces/DeepProp.js';
import type {
    FilledOptions,
    OptionalOptions,
    RequiredOptions
} from '../interfaces/Options.js';

type OptionalOptionsWithoutIamEndpoint = Omit<
    OptionalOptions,
    'authorization'
> & {
    authorization: Omit<OptionalOptions['authorization'], 'iamEndpoint'>;
};

/**
 * Helper function that fills the missing properties of the `Options` object
 * with default values
 * @param options The options to fill
 * @returns The filled options
 * @typeParam TUserIdentifier The type of the user identifier
 * @throws Error if any of the required options are missing or invalid
 */
export default function parseOptions<TUserIdentifier>(
    options: Options<TUserIdentifier>
): FilledOptions<TUserIdentifier> {
    /**
     * Separation of the required and optional options
     */
    const requiredOptions: RequiredOptions<TUserIdentifier> = {
        authentication: {
            secret: options.authentication.secret,
            userIdentifier: options.authentication.userIdentifier
        },
        authorization: {
            rolesProvider: options.authorization.rolesProvider
        }
    };

    const _optionalOptions: DeepPartial<OptionalOptionsWithoutIamEndpoint> = {
        authentication: {
            expirationTimeSpan: options.authentication.expirationTimeSpan,
            method: options.authentication.method,
            path: options.authentication.path
        }
    };

    /**
     * Check validity of the required options
     */
    deepCheckObject(requiredOptions);

    /**
     * Fill the missing properties of the optional options with default values
     */
    const optionalOptions: OptionalOptionsWithoutIamEndpoint = fillObject(
        _optionalOptions as Partial<OptionalOptionsWithoutIamEndpoint>,
        constants.defaultOptions,
        true
    );

    const iamEndpoint =
        options.authorization.iamEndpoint === null
            ? null
            : typeof options.authorization.iamEndpoint === 'undefined'
              ? constants.defaultOptions.authorization.iamEndpoint
              : fillObject(
                    options.authorization.iamEndpoint,
                    constants.defaultOptions.authorization.iamEndpoint!,
                    true
                );

    /**
     * Spread the required and optional options into the final object
     */
    const filledOptions = {
        authentication: {
            ...optionalOptions.authentication,
            ...requiredOptions.authentication
        },
        authorization: {
            ...optionalOptions.authorization,
            ...requiredOptions.authorization,
            iamEndpoint
        }
    };

    return filledOptions;
}
