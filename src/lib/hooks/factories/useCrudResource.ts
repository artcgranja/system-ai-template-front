/**
 * Generic CRUD Resource Hook
 * Creates type-safe React Query hooks for any CRUD resource
 * Eliminates boilerplate and ensures consistency across all resource hooks
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/types/api';
import { DEFAULT_QUERY_CONFIG } from '../config/queryConfig';

/**
 * CRUD API interface that the resource must implement
 */
export interface CrudApiInterface<TEntity, TCreateInput, TUpdateInput> {
  getAll: () => Promise<TEntity[]>;
  create: (data: TCreateInput) => Promise<TEntity>;
  update: (id: string, updates: TUpdateInput) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
}

/**
 * Store actions interface for state management
 */
export interface StoreActions<TEntity> {
  setAll: (items: TEntity[]) => void;
  add: (item: TEntity) => void;
  update: (id: string, item: TEntity) => void;
  remove: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Configuration for creating a CRUD resource hook
 */
export interface UseCrudResourceConfig<TEntity, TCreateInput, TUpdateInput> {
  /**
   * Unique query key for this resource (e.g., 'folders', 'conversations')
   */
  queryKey: string | readonly string[];

  /**
   * API methods for CRUD operations
   */
  api: CrudApiInterface<TEntity, TCreateInput, TUpdateInput>;

  /**
   * Store actions for state management
   */
  storeActions: StoreActions<TEntity>;

  /**
   * Whether the user is authenticated (enables/disables queries)
   */
  isAuthenticated: boolean;

  /**
   * Additional query keys to invalidate on mutations
   * Useful for invalidating related resources (e.g., invalidate conversations when deleting folder)
   */
  invalidateOnMutate?: Array<string | readonly string[]>;
}

/**
 * Return type for the CRUD resource hook
 */
export interface UseCrudResourceResult<TEntity, TCreateInput, TUpdateInput> {
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;

  /**
   * Create a new entity
   */
  create: (data: TCreateInput) => Promise<TEntity | undefined>;

  /**
   * Update an existing entity
   */
  update: (id: string, updates: TUpdateInput) => Promise<void>;

  /**
   * Delete an entity
   */
  remove: (id: string) => Promise<void>;

  /**
   * Manually refetch data
   */
  refetch: () => Promise<void>;
}

/**
 * Generic CRUD resource hook
 * Creates a fully functional hook with queries and mutations for any resource
 *
 * @param config - Configuration object
 * @returns Hook result with CRUD operations
 *
 * @example
 * // In useFolders.ts
 * export function useFolders() {
 *   const store = useChatStore();
 *   const isAuthenticated = useAuthCheck();
 *
 *   return useCrudResource({
 *     queryKey: 'folders',
 *     api: foldersApi,
 *     storeActions: {
 *       setAll: store.setFolders,
 *       add: store.addFolder,
 *       update: store.updateFolder,
 *       remove: store.removeFolder,
 *       setLoading: store.setLoadingFolders,
 *     },
 *     isAuthenticated,
 *     invalidateOnMutate: ['conversations'], // Also invalidate conversations
 *   });
 * }
 */
export function useCrudResource<
  TEntity extends { id: string },
  TCreateInput,
  TUpdateInput
>(
  config: UseCrudResourceConfig<TEntity, TCreateInput, TUpdateInput>
): UseCrudResourceResult<TEntity, TCreateInput, TUpdateInput> {
  const {
    queryKey,
    api,
    storeActions,
    isAuthenticated,
    invalidateOnMutate = [],
  } = config;

  const queryClient = useQueryClient();
  const queryKeyArray = useMemo(
    () => (Array.isArray(queryKey) ? queryKey : [queryKey]),
    [queryKey]
  );

  // Fetch query
  const { isLoading, refetch: queryRefetch } = useQuery({
    queryKey: queryKeyArray,
    queryFn: async () => {
      try {
        const data = await api.getAll();
        storeActions.setAll(data);
        return data;
      } catch (error) {
        console.error(`Failed to fetch ${queryKeyArray[0]}:`, error);
        storeActions.setLoading(false);
        throw error;
      }
    },
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: (newItem) => {
      storeActions.add(newItem);
      queryClient.invalidateQueries({ queryKey: queryKeyArray });
      invalidateOnMutate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });
    },
    onError: (error: ApiError) => {
      console.error(`Failed to create ${queryKeyArray[0]}:`, error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TUpdateInput }) =>
      api.update(id, updates),
    onSuccess: (updatedItem) => {
      storeActions.update(updatedItem.id, updatedItem);
      queryClient.invalidateQueries({ queryKey: queryKeyArray });
      invalidateOnMutate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });
    },
    onError: (error: ApiError) => {
      console.error(`Failed to update ${queryKeyArray[0]}:`, error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      storeActions.remove(id);
      queryClient.invalidateQueries({ queryKey: queryKeyArray });
      invalidateOnMutate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });
    },
    onError: (error: ApiError) => {
      console.error(`Failed to delete ${queryKeyArray[0]}:`, error);
    },
  });

  // Wrapper functions with error handling
  const create = useCallback(
    async (data: TCreateInput): Promise<TEntity | undefined> => {
      try {
        return await createMutation.mutateAsync(data);
      } catch (error) {
        console.error(`Error creating ${queryKeyArray[0]}:`, error);
        return undefined;
      }
    },
    [createMutation, queryKeyArray]
  );

  const update = useCallback(
    async (id: string, updates: TUpdateInput): Promise<void> => {
      try {
        await updateMutation.mutateAsync({ id, updates });
      } catch (error) {
        console.error(`Error updating ${queryKeyArray[0]}:`, error);
      }
    },
    [updateMutation, queryKeyArray]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error(`Error deleting ${queryKeyArray[0]}:`, error);
      }
    },
    [deleteMutation, queryKeyArray]
  );

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    isLoading,
    create,
    update,
    remove,
    refetch,
  };
}
