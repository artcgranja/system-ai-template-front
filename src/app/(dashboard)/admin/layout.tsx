'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Coins,
  Building2,
  Shield,
  FileText,
  ChevronLeft,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/constants';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/quotas', label: 'Cotas', icon: Coins },
  { href: '/admin/departments', label: 'Departamentos', icon: Building2 },
  { href: '/admin/roles', label: 'Cargos', icon: Shield },
  { href: '/admin/feedback', label: 'Feedbacks', icon: MessageSquare },
  { href: '/admin/audit-logs', label: 'Logs de Auditoria', icon: FileText },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessAdmin, isLoading, permissions } = usePermissions();

  useEffect(() => {
    if (!isLoading && !canAccessAdmin) {
      router.push(ROUTES.chat);
    }
  }, [isLoading, canAccessAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <div className="flex h-full">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Link href={ROUTES.chat}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar ao Chat
            </Button>
          </Link>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold mb-1">Administracao</h2>
          <p className="text-sm text-muted-foreground">Gerenciamento do sistema</p>
        </div>

        <nav className="flex-1 px-2">
          <ul className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground">
            Logado como {permissions?.roleName || 'Admin'}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
