/**
 * Generic Transformer Factory
 * Creates type-safe transformers for converting between backend and frontend data formats
 */

import { toCamelCase, toSnakeCase } from './case-converter';

/**
 * Mapping configuration for custom field transformations
 * Maps frontend keys to either:
 * - A backend key name (string)
 * - A transformation function (backend) => frontendValue
 */
export type FieldMapping<TFrontend, TBackend> = {
  [K in keyof TFrontend]?:
    | keyof TBackend
    | ((backend: TBackend) => TFrontend[K]);
};

/**
 * Configuration for date field conversion
 * These fields will be automatically converted from string to Date
 */
export interface DateFieldConfig {
  /**
   * Fields that should be converted from string to Date
   * Example: ['createdAt', 'updatedAt', 'pinnedAt']
   */
  dateFields?: string[];
}

/**
 * Full transformer configuration
 */
export interface TransformerConfig<TFrontend, TBackend> {
  /**
   * Custom field mappings for complex transformations
   * If not provided, automatic snake_case → camelCase conversion is used
   */
  customMappings?: FieldMapping<TFrontend, TBackend>;

  /**
   * Fields that should be converted from string to Date
   * Automatic conversion for: created_at, updated_at, pinned_at
   */
  dateFields?: string[];
}

/**
 * A transformer that converts between backend (snake_case) and frontend (camelCase) formats
 */
export interface Transformer<TFrontend, TBackend> {
  /**
   * Convert backend data to frontend format
   * - Converts snake_case keys to camelCase
   * - Applies custom transformations
   * - Converts date strings to Date objects
   */
  fromBackend: (backend: TBackend) => TFrontend;

  /**
   * Convert frontend data to backend format
   * - Converts camelCase keys to snake_case
   * - Filters out undefined values
   * - Handles partial updates
   */
  toBackend: (frontend: Partial<TFrontend>) => Partial<TBackend>;
}

/**
 * Default date fields that are automatically converted
 */
const DEFAULT_DATE_FIELDS = ['created_at', 'updated_at', 'pinned_at', 'createdAt', 'updatedAt', 'pinnedAt'];

/**
 * Convert a date string to Date object, handling null/undefined
 */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

/**
 * Create a generic transformer for any resource
 *
 * @param config - Configuration for custom mappings and date fields
 * @returns A transformer with fromBackend and toBackend methods
 *
 * @example
 * // Simple automatic transformation
 * const folderTransformer = createTransformer<Folder, BackendFolder>({
 *   dateFields: ['createdAt', 'updatedAt'],
 * });
 *
 * @example
 * // With custom mappings
 * const conversationTransformer = createTransformer<Conversation, BackendConversation>({
 *   customMappings: {
 *     // Custom transformation for pinned date
 *     pinnedAt: (backend) => backend.pinned_at ? new Date(backend.pinned_at) : null,
 *   },
 *   dateFields: ['createdAt', 'updatedAt'],
 * });
 */
export function createTransformer<TFrontend, TBackend>(
  config: TransformerConfig<TFrontend, TBackend> = {}
): Transformer<TFrontend, TBackend> {
  const { customMappings = {}, dateFields = [] } = config;
  const allDateFields = [...DEFAULT_DATE_FIELDS, ...dateFields];

  return {
    fromBackend: (backend: TBackend): TFrontend => {
      // Start with automatic camelCase conversion
      const result = toCamelCase<TFrontend>(backend);

      // Apply date field conversions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultObj = result as Record<string, any>;
      for (const field of allDateFields) {
        if (field in resultObj && typeof resultObj[field] === 'string') {
          resultObj[field] = parseDate(resultObj[field]);
        }
      }

      // Apply custom mappings (overrides automatic conversion)
      if (customMappings && Object.keys(customMappings).length > 0) {
        for (const [frontendKey, mapping] of Object.entries(customMappings)) {
          if (typeof mapping === 'function') {
            // Custom transformation function
            resultObj[frontendKey] = mapping(backend);
          } else if (typeof mapping === 'string') {
            // Direct key mapping
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resultObj[frontendKey] = (backend as any)[mapping];
          }
        }
      }

      return result;
    },

    toBackend: (frontend: Partial<TFrontend>): Partial<TBackend> => {
      // Convert to snake_case
      const result = toSnakeCase<Partial<TBackend>>(frontend);

      // Filter out undefined values (keep null values for explicit unset)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultObj = result as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered: Record<string, any> = {};
      for (const key in resultObj) {
        if (resultObj[key] !== undefined) {
          filtered[key] = resultObj[key];
        }
      }

      return filtered as Partial<TBackend>;
    },
  };
}

/**
 * Create a simple transformer with no custom configuration
 * Uses automatic snake_case ↔ camelCase conversion and default date fields
 *
 * @example
 * const simpleTransformer = createSimpleTransformer<MyType, BackendMyType>();
 */
export function createSimpleTransformer<TFrontend, TBackend>(): Transformer<TFrontend, TBackend> {
  return createTransformer<TFrontend, TBackend>({});
}
