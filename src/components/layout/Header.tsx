'use client';

import { Menu, PlusCircle, LogOut, User, Sun, Moon, Settings, MessageSquare, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertsDropdown } from '@/components/alerts';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ROUTES } from '@/config/constants';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const { canAccessAdmin } = usePermissions();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleNewChat = () => {
    // Navigate to new chat page - conversation will be created when user sends first message
    router.push(ROUTES.chat);
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

  const handleLogout = async () => {
    await logout();
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

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo/Title */}
        <div className="flex-1">
          <h1 className="text-lg font-semibold">VORA Energia IA</h1>
        </div>

        {/* New Chat Button */}
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 sm:flex"
          onClick={handleNewChat}
        >
          <PlusCircle className="h-4 w-4" />
          Nova Conversa
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          onClick={handleNewChat}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>

        {/* Alerts Dropdown */}
        <AlertsDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
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
    </header>
  );
}
