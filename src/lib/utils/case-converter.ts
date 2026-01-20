/**
 * Case Converter Utilities
 * Provides utilities to convert object keys between snake_case and camelCase
 */

/**
 * Convert a snake_case string to camelCase
 * Example: "user_id" → "userId", "created_at" → "createdAt"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 * Example: "userId" → "user_id", "createdAt" → "created_at"
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Check if a value is a plain object (not null, array, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Convert all keys in an object from snake_case to camelCase
 * Handles nested objects and arrays recursively
 *
 * @param obj - Object with snake_case keys
 * @returns New object with camelCase keys
 *
 * @example
 * const backend = { user_id: "123", created_at: "2025-01-01" };
 * const frontend = toCamelCase(backend);
 * // Result: { userId: "123", createdAt: "2025-01-01" }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCamelCase<T = any>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  }

  if (!isPlainObject(obj)) {
    return obj as T;
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];
      result[camelKey] = toCamelCase(value);
    }
  }
  return result as T;
}

/**
 * Convert all keys in an object from camelCase to snake_case
 * Handles nested objects and arrays recursively
 *
 * @param obj - Object with camelCase keys
 * @returns New object with snake_case keys
 *
 * @example
 * const frontend = { userId: "123", createdAt: "2025-01-01" };
 * const backend = toSnakeCase(frontend);
 * // Result: { user_id: "123", created_at: "2025-01-01" }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSnakeCase<T = any>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  }

  if (!isPlainObject(obj)) {
    return obj as T;
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];
      result[snakeKey] = toSnakeCase(value);
    }
  }
  return result as T;
}
