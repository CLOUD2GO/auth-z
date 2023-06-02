import constants from '../util/constants';
import Role from './Role';

export type DefaultResource = typeof constants.authorization.resources.default;
export type AnyResource = typeof constants.authorization.resources.any;
export type AllResources = typeof constants.authorization.resources.all;

interface Permission {
    context: Role['context'];
    scope: string;
    action: {
        read: boolean;
        write: boolean;
    };
    resources: string[] | AllResources | DefaultResource;
}

export default Permission;
