/**
 * Represents a value that can be `null`
 */
type Nullable<T> = T | null;

/**
 * Represents a value that can be `undefined`
 */
export type Undefinable<T> = T | undefined;

/**
 * Represents a value that can be `null` or `undefined`
 */
export type Optional<T> = Nullable<T> | Undefinable<T>;

export default Nullable;
