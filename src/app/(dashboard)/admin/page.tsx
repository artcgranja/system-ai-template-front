import { fetchAdminDashboard } from '@/lib/actions/admin';
import { AdminDashboardClient } from './client';

/**
 * Admin Dashboard Page - Server Component
 * Fetches initial data on server for faster first paint
 */
export default async function AdminDashboardPage() {
  const dashboard = await fetchAdminDashboard();

  return <AdminDashboardClient initialData={dashboard} />;
}
