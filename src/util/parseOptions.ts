import fillObject from 'fill-object';
import Options, { FilledOptions, OptionalOptions } from '../interfaces/Options';
import constants from './constants';

export default function parseOptions(options: Options): FilledOptions {
    const {
        userIdentifier,
        authentication,
        authorization,
        ..._optionalOptions
    } = options;

    const requiredOptions = {
        userIdentifier,
        authentication,
        authorization
    };

    for (const [key, value] of Object.entries(requiredOptions))
        if (value === undefined)
            throw new Error(`Missing required option: ${key}`);

    const filledOptionalOptions: OptionalOptions = fillObject(
        _optionalOptions,
        constants.defaultOptions,
        true
    );

    const fullAuth = {
        ...filledOptionalOptions.authentication,
        ...requiredOptions.authentication
    };

    return {
        ...requiredOptions,
        ...filledOptionalOptions,
        authentication: fullAuth
    };
}
