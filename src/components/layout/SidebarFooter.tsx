'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, HelpCircle, Sun, Moon, Settings, MessageSquare, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTheme } from 'next-themes';
import { ROUTES } from '@/config/constants';

interface SidebarFooterProps {
  collapsed?: boolean;
  onOpenHelp?: () => void;
}

export function SidebarFooter({ collapsed = false, onOpenHelp }: SidebarFooterProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { canAccessAdmin } = usePermissions();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigateToProfile = () => {
    router.push('/profile');
  };

  const handleNavigateToAdmin = () => {
    router.push('/admin');
  };

  const handleNavigateToFeedback = () => {
    router.push(ROUTES.feedback);
  };

  const handleNavigateToWiki = () => {
    router.push(ROUTES.wiki);
  };

  // Default to dark theme if theme is undefined (during hydration)
  const currentTheme = theme || 'dark';

  const handleThemeToggle = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border bg-sidebar-background p-2 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 hover:bg-sidebar-border/50 hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              title={user?.name || 'Usuário'}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="right">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNavigateToProfile}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            {canAccessAdmin && (
              <DropdownMenuItem onClick={handleNavigateToAdmin}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Administracao</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleNavigateToFeedback}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Feedback</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNavigateToWiki}>
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Wiki</span>
            </DropdownMenuItem>
            {onOpenHelp && (
              <DropdownMenuItem onClick={onOpenHelp}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Atalhos de teclado</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleThemeToggle}>
              {currentTheme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Tema Escuro</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border bg-sidebar-background p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-2 h-auto py-2 hover:bg-sidebar-border/50 hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start flex-1 min-w-0 text-left">
              <p className="text-sm font-medium leading-none truncate w-full text-left">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate w-full mt-1 text-left">
                {user?.email}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" side="top">
          <DropdownMenuItem onClick={handleNavigateToProfile}>
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          {canAccessAdmin && (
            <DropdownMenuItem onClick={handleNavigateToAdmin}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Administracao</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleNavigateToFeedback}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Feedback</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleNavigateToWiki}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Wiki</span>
          </DropdownMenuItem>
          {onOpenHelp && (
            <DropdownMenuItem onClick={onOpenHelp}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Atalhos de teclado</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleThemeToggle}>
            {currentTheme === 'dark' ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Tema Escuro</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
