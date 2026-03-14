'use client';

import { useEffect, useRef } from 'react';
import { FileText, Handshake, ScrollText, Receipt } from 'lucide-react';
import Link from 'next/link';

export type NotificationType = 'application' | 'loi' | 'lease' | 'invoice';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link_url: string;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  application: FileText,
  loi: Handshake,
  lease: ScrollText,
  invoice: Receipt,
};

const typeColors: Record<NotificationType, string> = {
  application: 'text-primary',
  loi: 'text-warning',
  lease: 'text-success',
  invoice: 'text-muted-foreground',
};

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'application',
    title: 'New Application Received',
    message: 'Pacific Coast Welding LLC submitted for Suite A',
    timestamp: '2 hours ago',
    read: false,
    link_url: '/applications',
  },
  {
    id: '2',
    type: 'loi',
    title: 'LOI Countered',
    message: 'RSD Holdings countered base rent for Suite C',
    timestamp: 'Yesterday',
    read: false,
    link_url: '/lois',
  },
  {
    id: '3',
    type: 'lease',
    title: 'Lease Executed',
    message: 'All parties signed lease for Suite D',
    timestamp: '3 days ago',
    read: true,
    link_url: '/leases',
  },
  {
    id: '4',
    type: 'invoice',
    title: 'Invoice Paid',
    message: 'RR-06 payment received',
    timestamp: '1 week ago',
    read: true,
    link_url: '/invoices',
  },
];

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap within the panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelectors = 'a[href], button, [tabindex]:not([tabindex="-1"])';
    const focusableElements = panel.querySelectorAll<HTMLElement>(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first element when panel opens
    firstFocusable?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

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

    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [notifications]);

  return (
    <>
      {/* Backdrop to close panel */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
        className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-border bg-white shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <button
            onClick={onMarkAllRead}
            className="text-xs font-medium text-primary hover:text-primary-light transition-colors"
          >
            Mark all read
          </button>
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const iconColor = typeColors[notification.type];

              return (
                <Link
                  key={notification.id}
                  href={notification.link_url}
                  onClick={onClose}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.timestamp}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={onClose}
              className="block text-center text-xs font-medium text-primary hover:text-primary-light transition-colors"
            >
              View All
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
