import { fetchAdminUsers, fetchDepartments, fetchRoles } from '@/lib/actions/admin';
import { AdminUsersClient } from './client';

/**
 * Admin Users Page - Server Component
 * Fetches initial data on server for faster first paint
 */
export default async function AdminUsersPage() {
  // Fetch initial data in parallel
  const [usersData, departments, roles] = await Promise.all([
    fetchAdminUsers({ pageSize: 50 }),
    fetchDepartments(),
    fetchRoles(),
  ]);

  return (
    <AdminUsersClient
      initialUsers={usersData?.users ?? []}
      initialTotal={usersData?.total ?? 0}
      initialDepartments={departments ?? []}
      initialRoles={roles ?? []}
    />
  );
}
