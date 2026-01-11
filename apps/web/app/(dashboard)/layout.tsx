'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores';
import {
  Search,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  FolderSearch,
  MessageSquare,
  LayoutDashboard,
  ChevronDown,
  User,
  FolderOpen,
  Building2,
  Moon,
  Sun,
  Command,
  Shield,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { LogoIcon } from '@/components/ui/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { name: 'Chat & Search', href: '/dashboard/search', icon: MessageSquare },
  { name: 'Find Files', href: '/dashboard/files', icon: FolderSearch },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Organization', href: '/dashboard/organization', icon: Building2 },
  { name: 'Permissions', href: '/dashboard/permissions', icon: Shield },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch user data
  const { data: user } = trpc.auth.me.useQuery();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const { data: initData, isLoading: initLoading } = trpc.config.isInitialized.useQuery();

  // Check initialization first
  useEffect(() => {
    if (!initLoading && !initData?.isInitialized) {
      router.push('/setup');
    }
  }, [initData, initLoading, router]);

  // Then check authentication
  useEffect(() => {
    if (!initLoading && initData?.isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [initData, initLoading, isAuthenticated, router]);

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Get user initials for avatar
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Theme toggle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode =
        theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const newIsDark = !html.classList.contains('dark');
    setIsDark(newIsDark);

    if (newIsDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/files?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="bg-background text-foreground selection:bg-primary/20 flex h-screen">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="bg-foreground/30 fixed inset-0 z-40 transition-all duration-200 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Clean & Minimal */}
      <aside
        className={`bg-card border-border fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-200 ease-out lg:static ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        onClick={(e) => {
          if (window.innerWidth < 1024) {
            const target = e.target as HTMLElement;
            if (target.closest('a')) {
              setMobileMenuOpen(false);
            }
          }
        }}
      >
        {/* Logo Section */}
        <div
          className={`border-border flex h-16 items-center border-b ${sidebarOpen ? 'justify-between px-5' : 'justify-center px-0'}`}
        >
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'gap-0'}`}>
            <LogoIcon size={36} className="flex-shrink-0" />
            {sidebarOpen && (
              <div className="animate-fadeIn">
                <h1 className="text-foreground text-base font-semibold tracking-tight">FileAI</h1>
                <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wide">
                  Smart Documents
                </p>
              </div>
            )}
          </div>
          {sidebarOpen && mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-accent rounded-lg p-2 transition-colors lg:hidden"
            >
              <X className="text-muted-foreground h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`sidebar-item ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                  title={item.name}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''} ${!sidebarOpen ? 'm-0' : ''}`}
                  />
                  {sidebarOpen && <span className="animate-fadeIn truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* AI Usage Indicator */}
        {sidebarOpen && (
          <div className="bg-accent border-border mx-3 mb-3 rounded-lg border px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">AI Tokens</span>
              <span className="text-primary text-xs font-semibold">84%</span>
            </div>
            <div className="bg-border h-1 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[84%] rounded-full" />
            </div>
          </div>
        )}

        {/* User Section */}
        <div className="border-border mt-auto border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`hover:bg-accent flex w-full items-center rounded-lg p-2.5 transition-colors duration-150 ${
                  sidebarOpen ? 'gap-3' : 'justify-center'
                }`}
              >
                <div className="relative">
                  <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-full">
                    <span className="text-primary-foreground text-xs font-semibold">
                      {getInitials(user?.name, user?.email)}
                    </span>
                  </div>
                  <div className="bg-chart-2 border-card absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" />
                </div>
                {sidebarOpen && (
                  <>
                    <div className="animate-fadeIn min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{user?.name || 'Admin User'}</p>
                      <p className="text-muted-foreground/60 truncate text-xs">
                        {user?.email || 'admin@example.com'}
                      </p>
                    </div>
                    <ChevronDown className="text-muted-foreground/50 h-4 w-4 flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={sidebarOpen ? 'end' : 'start'}
              side="right"
              className="bg-card border-border w-56 rounded-lg p-1.5 shadow-lg"
            >
              <div className="border-border mb-1 border-b px-2.5 py-2">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  Account
                </p>
              </div>
              <DropdownMenuItem asChild className="focus:bg-accent cursor-pointer rounded py-2">
                <Link href="/dashboard/account" className="flex items-center gap-2.5">
                  <User className="h-4 w-4" />
                  <span className="font-medium">My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="focus:bg-accent cursor-pointer rounded py-2">
                <Link href="/dashboard/settings" className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="focus:bg-accent cursor-pointer rounded py-2">
                <Link href="/dashboard/permissions" className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Permissions</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer rounded py-2"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Header - Minimal & Functional */}
        <header className="border-border bg-background sticky top-0 z-40 flex h-16 items-center justify-between border-b px-5">
          <div className="flex max-w-xl flex-1 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-accent text-muted-foreground hover:text-foreground hidden rounded-lg p-2 transition-colors lg:flex"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="group relative flex-1 lg:max-w-sm">
              <Search className="text-muted-foreground group-focus-within:text-primary absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors" />
              <form onSubmit={handleSearch}>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search documents..."
                  className="bg-accent border-border focus:ring-primary focus:border-primary placeholder:text-muted-foreground h-10 w-full rounded-lg pl-10 pr-16 font-medium focus:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 sm:flex">
                <kbd className="bg-background border-border text-muted-foreground flex h-5 items-center justify-center rounded border px-1.5 text-[10px] font-medium">
                  <Command className="mr-0.5 h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg transition-colors"
            >
              {isDark ? (
                <Sun className="text-chart-4 h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </Button>

            <NotificationDropdown />

            <div className="bg-border/50 mx-1 hidden h-5 w-px sm:block" />

            <Link href="/dashboard/upload">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hidden h-9 items-center gap-2 rounded-lg px-4 font-medium sm:flex">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
