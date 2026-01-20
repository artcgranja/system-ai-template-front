/**
 * Wiki API Module
 * Handles wiki documentation API endpoint
 */

import apiClient from './client';

const WIKI_ENDPOINT = '/api/wiki';

/**
 * Response type for wiki endpoint
 */
export interface WikiResponse {
  content: string;
}

/**
 * Get wiki documentation content
 * @returns Wiki markdown content
 */
export async function getWikiContent(): Promise<string> {
  try {
    const response = await apiClient.get<WikiResponse>(WIKI_ENDPOINT);
    return response.data.content;
  } catch (error) {
    // Re-throw to let the hook handle error states
    throw error;
  }
}
