/**
 * Folders Hook
 * Manages folder state and operations using generic CRUD hook
 */

import { useCallback } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import { foldersApi, type CreateFolderInput } from '@/lib/api/folders';
import { useCrudResource } from './factories/useCrudResource';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS } from './config/queryConfig';
import type { Folder } from '@/types/chat';

export function useFolders() {
  const {
    folders,
    setFolders,
    addFolder,
    updateFolder: updateFolderStore,
    removeFolder,
    setLoadingFolders,
    setOperationLoading,
    isOperationLoading,
  } = useChatStore();

  const isAuthenticated = useAuthCheck();

  // Create API adapter to match CrudApiInterface
  const apiAdapter = {
    getAll: foldersApi.getFolders,
    create: foldersApi.createFolder,
    update: foldersApi.updateFolder,
    delete: foldersApi.deleteFolder,
  };

  // Use generic CRUD hook
  const { isLoading, create, update, remove, refetch } = useCrudResource<
    Folder,
    CreateFolderInput,
    Partial<Folder>
  >({
    queryKey: QUERY_KEYS.folders,
    api: apiAdapter,
    storeActions: {
      setAll: setFolders,
      add: addFolder,
      update: updateFolderStore,
      remove: removeFolder,
      setLoading: setLoadingFolders,
    },
    isAuthenticated,
    invalidateOnMutate: [QUERY_KEYS.conversations], // Also invalidate conversations when folder is deleted
  });

  // Wrapper for createFolder to match original API (name, color, icon) => Promise<Folder>
  const createFolder = useCallback(
    async (
      name: string,
      color?: string,
      icon?: string
    ): Promise<Folder | undefined> => {
      setOperationLoading('create-folder', 'new', true);
      try {
        return await create({ name, color, icon });
      } finally {
        setOperationLoading('create-folder', 'new', false);
      }
    },
    [create, setOperationLoading]
  );

  // Wrapper for updateFolder to match original API
  const updateFolder = useCallback(
    async (id: string, updates: Partial<Folder>) => {
      setOperationLoading('rename-folder', id, true);
      try {
        return await update(id, updates);
      } finally {
        setOperationLoading('rename-folder', id, false);
      }
    },
    [update, setOperationLoading]
  );

  // Wrapper for deleteFolder to match original API
  const deleteFolder = useCallback(
    async (id: string) => {
      setOperationLoading('delete-folder', id, true);
      try {
        return await remove(id);
      } finally {
        setOperationLoading('delete-folder', id, false);
      }
    },
    [remove, setOperationLoading]
  );

  return {
    folders,
    isLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch,
    isOperationLoading,
  };
}
