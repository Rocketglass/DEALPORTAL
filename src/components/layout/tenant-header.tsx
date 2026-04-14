'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  LayoutDashboard,
  FileText,
  FileSignature,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  NotificationPanel,
  type Notification,
} from './notification-panel';

// Tenant-specific nav items (no invoices)
const tenantMobileNavItems = [
  { href: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenant/applications', label: 'My Applications', icon: FileText },
  { href: '/tenant/lois', label: 'LOIs', icon: FileSignature },
  { href: '/tenant/leases', label: 'Leases', icon: ScrollText },
];

/** Derive 1-2 character initials from a name or email address. */
function getInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes('@')) return trimmed.slice(0, 2).toUpperCase();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const pageTitles: Record<string, string> = {
  '/tenant/dashboard': 'Dashboard',
  '/tenant/applications': 'Applications',
  '/tenant/lois': 'LOIs',
  '/tenant/leases': 'Leases',
  '/tenant/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return 'Tenant Portal';
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek === 1) return '1 week ago';
  return `${diffWeek} weeks ago`;
}

export function TenantHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [userDisplay, setUserDisplay] = useState<{
    initials: string;
    label: string;
  }>({ initials: '??', label: '' });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name: string = user.user_metadata?.full_name ?? '';
      const email: string = user.email ?? '';
      const label = name || email;
      const initials = getInitials(name || email);
      setUserDisplay({ initials, label });
    });
  }, []);

  // Fetch unread count on mount and navigation
  useEffect(() => {
    let cancelled = false;
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/user/notifications');
        if (!res.ok) return;
        const { notifications: data } = await res.json();
        if (cancelled) return;
        const count = (data ?? []).filter((n: { read: boolean }) => !n.read).length;
        setUnreadBadgeCount(count);
      } catch {
        // Non-critical
      }
    }
    fetchUnreadCount();
    return () => { cancelled = true; };
  }, [pathname]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (!showNotifications) return;
    let cancelled = false;
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/user/notifications');
        if (!res.ok) return;
        const { notifications: data } = await res.json();
        if (cancelled) return;
        const mapped = (data ?? []).map(
          (n: {
            id: string;
            type: string;
            title: string;
            message: string;
            link_url: string | null;
            read: boolean;
            created_at: string;
          }): Notification => ({
            id: n.id,
            type: n.type as Notification['type'],
            title: n.title,
            message: n.message,
            link_url: n.link_url ?? '#',
            read: n.read,
            timestamp: formatRelativeTime(n.created_at),
          }),
        );
        setNotifications(mapped);
        setUnreadBadgeCount(mapped.filter((n: Notification) => !n.read).length);
      } catch {
        // Non-critical
      }
    }
    fetchNotifications();
    return () => { cancelled = true; };
  }, [showNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadBadgeCount(0);
    try {
      await fetch('/api/user/notifications', { method: 'PATCH' });
    } catch {
      // Optimistic update already applied
    }
  }, []);

  // Close user menu on Escape
  useEffect(() => {
    if (!showUserMenu) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowUserMenu(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showUserMenu]);

  // Close mobile nav on Escape
  useEffect(() => {
    if (!showMobileNav) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowMobileNav(false);
        hamburgerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMobileNav]);

  // Focus trap for mobile nav
  useEffect(() => {
    if (!showMobileNav) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const closeButton = drawer.querySelector<HTMLElement>('button[aria-label="Close navigation menu"]');
    closeButton?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [showMobileNav]);

  async function handleSignOut() {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Supabase not available
      }
    }
    setShowMobileNav(false);
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-[var(--background-raised)] px-4 sm:px-6">
        {/* Left side: hamburger (mobile) + page title */}
        <div className="flex items-center gap-2">
          {/* Hamburger button -- visible on mobile only */}
          <button
            ref={hamburgerRef}
            onClick={() => setShowMobileNav(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={showMobileNav}
            aria-controls="tenant-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            {getPageTitle(pathname)}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowUserMenu(false);
              }}
              aria-label="Notifications"
              aria-expanded={showNotifications}
              aria-haspopup="dialog"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadBadgeCount > 0 && (
                <span
                  aria-live="polite"
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
                >
                  {unreadBadgeCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu((prev) => !prev);
                setShowNotifications(false);
              }}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary"
                title={userDisplay.label}
              >
                {userDisplay.initials}
              </div>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-border bg-[var(--background-raised)] py-1 shadow-lg shadow-black/[0.08]"
                >
                  {userDisplay.label && (
                    <div className="border-b border-border-subtle px-3 pb-2 pt-2">
                      <p className="max-w-full truncate text-[12px] font-medium text-muted-foreground">
                        {userDisplay.label}
                      </p>
                    </div>
                  )}
                  <Link
                    href="/tenant/settings"
                    role="menuitem"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </Link>
                  <Link
                    href="/tenant/settings"
                    role="menuitem"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                  <div className="my-1 border-t border-border-subtle" />
                  <button
                    onClick={handleSignOut}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {showMobileNav && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setShowMobileNav(false)}
        />
      )}

      {/* Mobile nav drawer */}
      <div
        id="tenant-mobile-nav"
        ref={drawerRef}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={showMobileNav}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--background-raised)] shadow-xl transition-transform duration-200 ease-in-out lg:hidden',
          showMobileNav ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold tracking-tight leading-tight">Rocket Realty</span>
              <span className="text-[11px] text-muted-foreground leading-tight">Tenant Portal</span>
            </div>
          </div>
          <button
            onClick={() => { setShowMobileNav(false); hamburgerRef.current?.focus(); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
          {tenantMobileNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMobileNav(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 space-y-1">
          <Link
            href="/tenant/settings"
            onClick={() => setShowMobileNav(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/tenant/settings')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
