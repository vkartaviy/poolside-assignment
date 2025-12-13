const ISO_DATE_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates a strict ISO 8601 UTC timestamp (matches `new Date().toISOString()`).
 */
export function isValidISOString(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_UTC_REGEX.test(value)) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

/**
 * Validates a URL-safe identifier that we accept for client-generated todo IDs.
 * (We currently generate these as UUIDs, but keeping the validation more flexible
 * makes it easy to swap the id strategy later.)
 */
export function isValidIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 128 &&
    IDENTIFIER_REGEX.test(value)
  );
}
