'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  NotificationPanel,
  mockNotifications,
  type Notification,
} from './notification-panel';

/** Derive 1-2 character initials from a name or email address. */
function getInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  // If it looks like an email, use the first two chars of the local part
  if (trimmed.includes('@')) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/applications': 'Applications',
  '/lois': 'LOIs',
  '/leases': 'Leases',
  '/invoices': 'Invoices',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Match by prefix (e.g. /applications/123)
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return 'Portal';
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Current authenticated user — fetched client-side so the header is
  // always in sync with the active Supabase session.
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Close user menu on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showUserMenu) setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showUserMenu]);

  async function handleSignOut() {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Supabase not available
      }
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-foreground">
        {getPageTitle(pathname)}
      </h1>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
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
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                aria-live="polite"
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
              >
                {unreadCount}
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
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
              title={userDisplay.label}
            >
              {userDisplay.initials}
            </div>
            <ChevronDown className="h-3.5 w-3.5" />
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
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-white py-1 shadow-lg"
              >
                {/* User identity — read-only header row */}
                {userDisplay.label && (
                  <div className="border-b border-border px-3 pb-2 pt-1.5">
                    <p className="max-w-full truncate text-xs font-medium text-foreground">
                      {userDisplay.label}
                    </p>
                  </div>
                )}
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleSignOut}
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
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
  );
}
