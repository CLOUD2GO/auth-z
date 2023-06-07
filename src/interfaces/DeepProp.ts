/**
 * Make every property in T optional recursively, inverse of `DeepRequired<T>`
 */
export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;
/**
 * Make every property in T required recursively, inverse of `DeepPartial<T>`
 */
export type DeepRequired<T> = T extends object
    ? {
          [P in keyof T]-?: DeepRequired<T[P]>;
      }
    : T;
