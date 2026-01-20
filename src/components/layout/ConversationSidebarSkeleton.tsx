'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ConversationSidebar
 * Shows placeholder content while the sidebar loads
 */
export function ConversationSidebarSkeleton() {
  return (
    <div className="flex-1 px-2 py-4 space-y-4 overflow-hidden">
      {/* Folders Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        <div className="space-y-1 pl-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>

      {/* Pinned Section */}
      <div className="space-y-2">
        <div className="flex items-center px-2">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1 pl-2">
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>

      {/* Conversations Section */}
      <div className="space-y-2">
        <div className="flex items-center px-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3 pl-2">
          {/* Today group */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-10 ml-2" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          {/* Yesterday group */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-12 ml-2" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          {/* Older group */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 ml-2" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
