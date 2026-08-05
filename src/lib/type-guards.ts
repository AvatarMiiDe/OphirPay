/**
 * TypeScript type guard and narrowing utilities.
 */

/** Check if a value is non-null (filters null/undefined from arrays). */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Check if a value is a string. */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Check if a value is a number. */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/** Check if a value is a valid Stellar public key. */
export function isStellarKey(value: unknown): value is string {
  return typeof value === "string" && /^G[A-Z0-9]{55}$/.test(value);
}

/** Check if an error is an instance of Error. */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/** Assert that a value is non-null and throw if it is. */
export function assertNonNull<T>(value: T | null | undefined, message = "Value is null/undefined"): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}
