import type { OptionalOptions } from '../interfaces/Options.js';

/**
 * Default values for the optional options
 */
const defaultOptions: OptionalOptions = {
    authentication: {
        expirationTimeSpan: 3600,
        method: 'POST',
        path: '/authenticate'
    },
    authorization: {
        iamEndpoint: {
            method: 'GET',
            path: '/authz/iam'
        }
    }
};

/**
 * Constants used throughout the library
 */
export default {
    defaultOptions,
    /**
     * `JWT` authentication related constants
     */
    authentication: {
        /**
         * The issuer of the `JWT` token
         */
        jwtIssuer: '@cloud2go/auth-z Server',
        /**
         * The audience of the `JWT` token
         */
        jwtAudience: '@cloud2go/auth-z Client',
        /**
         * The subject of the `JWT` token
         */
        jwtSubject: '@cloud2go/auth-z User'
    },
    /**
     * Authorization related constants
     */
    authorization: {
        /**
         * Permission resource related constants, such as default value and
         * wildcard value
         */
        resources: {
            /**
             * Default resource string applied to a permission when no resource is specified
             */
            default: '__INTERNAL::[DEFAULT]__',
            /**
             * The resource string that represents a wildcard for all resources
             */
            all: 'All',
            /**
             * Resource array that represents no resources (empty) in a permission action
             */
            empty: [] as string[]
        },
        /**
         * Permission scope related constants, such as the validation regex
         */
        scope: {
            /**
             * The validation regex for a permission scope, allowing
             * only alphanumeric characters, dashes and underscores
             */
            validationRegex: /^[A-Z0-9_-]+$/i
        },
        /**
         * Permission action related constants, such as the allowed values
         */
        actions: {
            /**
             * The allowed values for a permission action
             */
            allowedValues: ['Read', 'Write', 'ReadWrite'] as const
        },
        /**
         * Permission internal storage related constants
         */
        keyGeneration: {
            /**
             * The glue used to join the permission context and scope for dictionary keys
             */
            glue: ':'
        }
    }
} as const;
