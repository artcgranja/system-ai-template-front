/**
 * Presentations API
 * Manages presentation file operations (PDF/PPTX from Gamma API)
 */

import apiClient, { handleApiResponse } from './client';
import type { PresentationFilesResponse } from '@/types/planning';

/**
 * Fetch presentation files for a plan
 * Returns signed URLs for PDF and PPTX files
 *
 * @param planId - The plan ID to fetch files for
 * @returns Promise with presentation files data
 */
export async function getPresentationFiles(planId: string): Promise<PresentationFilesResponse> {
  return handleApiResponse<PresentationFilesResponse>(
    apiClient.get(`/api/plans/${planId}/files`)
  );
}

/**
 * Presentations API object for consistent API patterns
 */
export const presentationsApi = {
  /**
   * Get presentation files (PDF/PPTX) for a plan
   * Signed URLs expire after 24 hours - call this to refresh them
   */
  getFiles: getPresentationFiles,
};

export default presentationsApi;
