// SPDX-License-Identifier: MIT

/**
 * Common validation helpers for forms and inputs.
 * Works standalone or alongside Zod schemas.
 */

/** Check if a string is a valid email address. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Check if a number is a valid positive amount. */
export function isValidAmount(value: string, min = 0.0000001, max = 1e12): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

/** Check if a string is within length bounds. */
export function isValidLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/** Check if a URL is valid. */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Get a user-friendly error message for a common input field. */
export function getFieldError(field: string, value: string): string | null {
  switch (field) {
    case "email":
      if (!value) return "Email is required";
      if (!isValidEmail(value)) return "Please enter a valid email address";
      return null;
    case "amount":
      if (!value) return "Amount is required";
      if (!isValidAmount(value)) return "Please enter a valid positive amount";
      return null;
    case "url":
      if (!value) return "URL is required";
      if (!isValidUrl(value)) return "Please enter a valid URL";
      return null;
    default:
      return null;
  }
}
