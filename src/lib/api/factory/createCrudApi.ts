/**
 * Generic CRUD API Factory
 * Creates type-safe CRUD operations for any resource
 * Eliminates boilerplate code and ensures consistency across all API endpoints
 */

import apiClient, { handleApiResponse } from '../client';
import type { ApiResponse } from '@/types/api';
import type { Transformer } from '@/lib/utils/transformers';

/**
 * Configuration for creating a CRUD API
 */
export interface CrudApiConfig<TFrontend, TBackend> {
  /**
   * API endpoint base path (e.g., '/api/folders', '/api/conversations')
   */
  endpoint: string;

  /**
   * Transformer for converting between backend and frontend formats
   */
  transformer: Transformer<TFrontend, TBackend>;

  /**
   * Custom operations beyond standard CRUD
   * These will be merged with the standard CRUD operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customOperations?: Record<string, (...args: any[]) => Promise<any>>;
}

/**
 * Standard CRUD operations interface
 */
export interface CrudApi<TFrontend, TCreateInput, TUpdateInput> {
  /**
   * Get all items
   * GET /endpoint
   */
  getAll: () => Promise<TFrontend[]>;

  /**
   * Get a single item by ID
   * GET /endpoint/:id
   */
  getById: (id: string) => Promise<TFrontend>;

  /**
   * Create a new item
   * POST /endpoint
   */
  create: (data: TCreateInput) => Promise<TFrontend>;

  /**
   * Update an existing item
   * PATCH /endpoint/:id
   */
  update: (id: string, updates: TUpdateInput) => Promise<TFrontend>;

  /**
   * Delete an item
   * DELETE /endpoint/:id
   */
  delete: (id: string) => Promise<void>;
}

/**
 * Create a type-safe CRUD API for a resource
 *
 * @param config - Configuration object
 * @returns API object with standard CRUD operations
 *
 * @example
 * // Basic usage
 * const folderTransformer = createTransformer<Folder, BackendFolder>();
 * const foldersApi = createCrudApi({
 *   endpoint: '/api/folders',
 *   transformer: folderTransformer,
 * });
 *
 * @example
 * // With custom operations
 * const conversationsApi = createCrudApi({
 *   endpoint: '/api/conversations',
 *   transformer: conversationTransformer,
 *   customOperations: {
 *     pin: async (id: string, isPinned: boolean) => {
 *       // Custom pin operation
 *     },
 *   },
 * });
 */
export function createCrudApi<
  TFrontend extends { id: string },
  TBackend,
  TCreateInput = Partial<TFrontend>,
  TUpdateInput = Partial<TFrontend>
>(
  config: CrudApiConfig<TFrontend, TBackend>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): CrudApi<TFrontend, TCreateInput, TUpdateInput> & Record<string, any> {
  const { endpoint, transformer, customOperations = {} } = config;

  const crudOperations: CrudApi<TFrontend, TCreateInput, TUpdateInput> = {
    /**
     * Get all items from the API
     */
    getAll: async (): Promise<TFrontend[]> => {
      const backendData = await handleApiResponse<TBackend[]>(
        apiClient.get<ApiResponse<TBackend[]>>(endpoint)
      );
      return backendData.map(transformer.fromBackend);
    },

    /**
     * Get a single item by ID
     */
    getById: async (id: string): Promise<TFrontend> => {
      const backendData = await handleApiResponse<TBackend>(
        apiClient.get<ApiResponse<TBackend>>(`${endpoint}/${id}`)
      );
      return transformer.fromBackend(backendData);
    },

    /**
     * Create a new item
     */
    create: async (data: TCreateInput): Promise<TFrontend> => {
      // Transform frontend data to backend format if needed
      const backendInput = transformer.toBackend(data as Partial<TFrontend>);

      const backendData = await handleApiResponse<TBackend>(
        apiClient.post<ApiResponse<TBackend>>(endpoint, backendInput)
      );
      return transformer.fromBackend(backendData);
    },

    /**
     * Update an existing item
     */
    update: async (id: string, updates: TUpdateInput): Promise<TFrontend> => {
      // Transform frontend updates to backend format
      const backendUpdates = transformer.toBackend(updates as Partial<TFrontend>);

      const backendData = await handleApiResponse<TBackend>(
        apiClient.patch<ApiResponse<TBackend>>(`${endpoint}/${id}`, backendUpdates)
      );
      return transformer.fromBackend(backendData);
    },

    /**
     * Delete an item
     */
    delete: async (id: string): Promise<void> => {
      return handleApiResponse<void>(
        apiClient.delete<ApiResponse<void>>(`${endpoint}/${id}`)
      );
    },
  };

  // Merge standard CRUD operations with custom operations
  return {
    ...crudOperations,
    ...customOperations,
  };
}

/**
 * Helper type to extract the API interface from a CRUD API instance
 * Useful for typing hooks and other consumers
 */
export type ExtractCrudApi<T> = T extends CrudApi<infer TFrontend, infer TCreate, infer TUpdate>
  ? CrudApi<TFrontend, TCreate, TUpdate>
  : never;
