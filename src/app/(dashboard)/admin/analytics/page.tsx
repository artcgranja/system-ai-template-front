import { fetchTokenUsageAnalytics, fetchDepartments } from '@/lib/actions/admin';
import { AdminAnalyticsClient } from './client';

/**
 * Admin Analytics Page - Server Component
 * Fetches initial data on server for faster first paint
 */
export default async function AdminAnalyticsPage() {
  // Fetch initial data in parallel
  const [analytics, departments] = await Promise.all([
    fetchTokenUsageAnalytics({ period: 'last_30_days', pageSize: 10 }),
    fetchDepartments(),
  ]);

  return (
    <AdminAnalyticsClient
      initialAnalytics={analytics}
      initialDepartments={departments ?? []}
    />
  );
}
