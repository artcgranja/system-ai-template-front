/**
 * Wiki Hook
 * Manages wiki documentation fetching using React Query
 */

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_QUERY_CONFIG, QUERY_KEYS } from './config/queryConfig';
import { getWikiContent } from '@/lib/api/wiki';

/**
 * Hook to fetch wiki documentation content
 * Since the endpoint is public, no authentication check is needed
 */
export function useWiki() {
  return useQuery<string>({
    queryKey: QUERY_KEYS.wiki,
    queryFn: () => getWikiContent(),
    ...DEFAULT_QUERY_CONFIG,
    // Cache wiki content for longer since it doesn't change frequently
    staleTime: 300000, // 5 minutes
  });
}
