type Nullable<T> = T | null;

export type Undefinable<T> = T | undefined;

export type Optional<T> = Nullable<T> | Undefinable<T>;

export default Nullable;
