'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  LayoutDashboard,
  FileText,
  Handshake,
  ScrollText,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

/** Derive 1-2 character initials from a name or email address. */
function getInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes('@')) return trimmed.slice(0, 2).toUpperCase();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/lois', label: 'LOIs', icon: Handshake },
  { href: '/leases', label: 'Leases', icon: ScrollText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [userDisplay, setUserDisplay] = useState<{
    initials: string;
    name: string;
    email: string;
  }>({ initials: '??', name: '', email: '' });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name: string = user.user_metadata?.full_name ?? '';
      const email: string = user.email ?? '';
      setUserDisplay({
        initials: getInitials(name || email),
        name,
        email,
      });
    });
  }, []);

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
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Rocket Realty</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        {/* Logged-in user identity */}
        {(userDisplay.name || userDisplay.email) && (
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {userDisplay.initials}
            </div>
            <div className="min-w-0">
              {userDisplay.name && (
                <p className="truncate text-sm font-medium text-foreground">
                  {userDisplay.name}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {userDisplay.email}
              </p>
            </div>
          </div>
        )}

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
