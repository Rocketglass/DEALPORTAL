import Link from 'next/link';
import { Building2, FileText, Handshake, ScrollText, Bell, ArrowRight, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { requireRole } from '@/lib/security/auth-guard';
import {
  getLandlordProperties,
  getEffectiveContactId,
  type LandlordProperty,
} from '@/lib/queries/landlord';
import { getUnreadNotifications, type Notification } from '@/lib/queries/notifications';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Landlord Portal',
};

function PropertyCard({ property }: { property: LandlordProperty }) {
  return (
    <Link href={`/landlord/applications?property=${property.id}`}>
      <Card className="group border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm cursor-pointer h-full">
        <CardContent className="p-5">
          {/* Property name and address */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
              <Building2 className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                {property.name}
              </h3>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {property.address}, {property.city}, {property.state} {property.zip}
              </p>
            </div>
          </div>

          {/* Unit count */}
          <p className="mt-3 text-[12px] text-muted-foreground">
            {property.unitCount === 0
              ? 'No units'
              : property.unitCount === 1
              ? '1 unit'
              : `${property.unitCount} units`}
          </p>

          {/* Deal pipeline mini-summary */}
          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pipeline
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.applicationCount}
                  </span>{' '}
                  {property.applicationCount === 1 ? 'Application' : 'Applications'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Handshake className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.activeLoiCount}
                  </span>{' '}
                  {property.activeLoiCount === 1 ? 'Active LOI' : 'Active LOIs'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.activeLeaseCount}
                  </span>{' '}
                  {property.activeLeaseCount === 1 ? 'Lease' : 'Leases'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatNotificationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PendingActions({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <Card className="border border-border-subtle">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Pending Actions</h2>
              <p className="text-[12px] text-muted-foreground">You&apos;re all caught up — no pending actions.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border-subtle">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">Pending Actions</h2>
            <p className="text-[12px] text-muted-foreground">
              {notifications.length} {notifications.length === 1 ? 'item needs' : 'items need'} your attention
            </p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-border-subtle">
          {notifications.map((n) => (
            <li key={n.id} className="py-3 first:pt-0 last:pb-0">
              {n.link_url ? (
                <Link href={n.link_url} className="group flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">
                      {n.message}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatNotificationTime(n.created_at)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">
                      {n.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
                    {formatNotificationTime(n.created_at)}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function LandlordDashboardPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : getEffectiveContactId(user);

  let properties: Awaited<ReturnType<typeof getLandlordProperties>>['data'] = null;
  let error: string | null = null;
  let notifications: Notification[] = [];

  try {
    const [propsResult, notifResult] = await Promise.all([
      getLandlordProperties(contactId),
      getUnreadNotifications(user.id),
    ]);
    properties = propsResult.data;
    error = propsResult.error;
    notifications = notifResult.data ?? [];
  } catch (err) {
    console.error('[Landlord Dashboard] Error fetching data:', err);
    error = err instanceof Error ? err.message : 'Failed to load properties';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Overview of your properties and deals
        </p>
      </div>

      {/* Pending Actions */}
      <div className="mt-6">
        <PendingActions notifications={notifications} />
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load properties. Please try refreshing the page.
        </div>
      )}

      {/* Property grid */}
      {!error && (
        <div className="mt-6">
          {!properties || properties.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No properties found</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Properties will appear here once your broker assigns deals to you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
