'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  Settings,
  LogOut,
  LayoutDashboard,
  FileText,
  FileSignature,
  ScrollText,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Building2,
  FileSignature,
  ScrollText,
  Receipt,
  Settings,
};
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

/** Derive the portal prefix (e.g., "/landlord") from the first nav item's href. */
function getPortalPrefix(navItems: PortalSidebarProps['navItems']): string {
  if (navItems.length === 0) return '';
  const first = navItems[0].href;
  // e.g., "/landlord/dashboard" => "/landlord"
  const parts = first.split('/').filter(Boolean);
  return parts.length > 0 ? `/${parts[0]}` : '';
}

export interface PortalSidebarProps {
  navItems: { href: string; label: string; iconName: string }[];
  portalName: string; // e.g. "Landlord Portal", "Tenant Portal"
}

export function PortalSidebar({ navItems, portalName }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const portalPrefix = getPortalPrefix(navItems);
  const settingsHref = `${portalPrefix}/settings`;

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
    <aside className="flex h-screen w-[248px] flex-col border-r border-border bg-[var(--background-raised)]">
      {/* Brand */}
      <Link href="/" className="flex h-16 items-center gap-2.5 px-5 transition-opacity hover:opacity-80">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight text-foreground leading-tight">
            Rocket Realty
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {portalName}
          </span>
        </div>
      </Link>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 pt-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/[0.08] text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                {(() => {
                  const Icon = ICON_MAP[item.iconName] ?? FileText;
                  return (
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                  );
                })()}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        {(userDisplay.name || userDisplay.email) && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {userDisplay.initials}
            </div>
            <div className="min-w-0">
              {userDisplay.name && (
                <p className="truncate text-[13px] font-medium text-foreground">
                  {userDisplay.name}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                {userDisplay.email}
              </p>
            </div>
          </div>
        )}

        <Link
          href={settingsHref}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
            pathname.startsWith(settingsHref)
              ? 'bg-primary/[0.08] text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
