/**
 * Represents the return type of a function that can be `sync` or `async`
 */
type Awaitable<T = void> = T | Promise<T>;

export default Awaitable;
