/**
 * Folders API
 * Manages folder operations using generic CRUD factory
 */

import { createCrudApi } from './factory/createCrudApi';
import { createTransformer } from '@/lib/utils/transformers';
import type { Folder, BackendFolder } from '@/types/chat';

/**
 * Transformer for converting between backend and frontend folder formats
 * Automatically handles:
 * - snake_case → camelCase conversion
 * - Date string → Date object conversion (created_at, updated_at)
 */
const folderTransformer = createTransformer<Folder, BackendFolder>({
  dateFields: ['createdAt', 'updatedAt'],
});

/**
 * Create input type for folder creation
 */
export interface CreateFolderInput {
  name: string;
  color?: string;
  icon?: string;
}

/**
 * Folders API with standard CRUD operations
 * Generated using createCrudApi factory
 */
const baseApi = createCrudApi<Folder, BackendFolder, CreateFolderInput, Partial<Folder>>({
  endpoint: '/api/folders',
  transformer: folderTransformer,
});

/**
 * Export with semantic method names for better readability
 */
export const foldersApi = {
  getFolders: baseApi.getAll,
  getFolder: baseApi.getById,
  createFolder: baseApi.create,
  updateFolder: baseApi.update,
  deleteFolder: baseApi.delete,
};
