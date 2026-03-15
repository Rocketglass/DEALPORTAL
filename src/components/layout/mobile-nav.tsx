'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Building2,
  LayoutDashboard,
  FileText,
  Handshake,
  ScrollText,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/lois', label: 'LOIs', icon: Handshake },
  { href: '/leases', label: 'Leases', icon: ScrollText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/comps', label: 'Comps', icon: BarChart3 },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Supabase not available
      }
    }
    setOpen(false);
    router.push('/login');
    router.refresh();
  }

  const closeDrawer = useCallback(() => {
    setOpen(false);
    // Restore focus to hamburger button when closed
    hamburgerRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeDrawer]);

  // Focus trap within the drawer when open
  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableSelectors = 'a[href], button, [tabindex]:not([tabindex="-1"])';

    // Focus the close button when drawer opens
    const closeButton = drawer.querySelector<HTMLElement>('button[aria-label="Close navigation menu"]');
    closeButton?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !drawer) return;

      const focusableElements = drawer.querySelectorAll<HTMLElement>(focusableSelectors);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        ref={hamburgerRef}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      {/* Slide-over drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={open}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-200 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </div>
          <button
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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

        {/* Settings + Sign out */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 space-y-1">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/settings')
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
