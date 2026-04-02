import Link from 'next/link';
import { FileText, Handshake, ScrollText, Receipt, DollarSign, TrendingUp, Clock, CheckCircle2, BarChart3, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getDashboardStats,
  getRecentActivity,
  getPipelineStats,
  getCommissionSummary,
  getCommissionTimeline,
  getDealFlowTimeline,
  getVacancyIntelligence,
} from '@/lib/queries/dashboard';
import { getPropertyAnalytics } from '@/lib/queries/property-analytics';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getRecentNotifications, type Notification } from '@/lib/queries/notifications';
import DashboardCharts from './dashboard-charts';
import { RefreshButton } from './refresh-button';
import VacancyIntelligenceSection from './vacancy-intelligence';
import PropertyPerformance from './property-performance';
import type { PipelineStage } from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Rocket Realty',
};

const ENTITY_LABELS: Record<string, string> = {
  application: 'Application',
  loi: 'LOI',
  lease: 'Lease',
  invoice: 'Invoice',
};


function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Pipeline bar component (server-rendered)
// ---------------------------------------------------------------------------

function PipelineRow({ stage }: { stage: PipelineStage }) {
  const activeStatuses = stage.statuses.filter((s) => s.count > 0);
  const activeTotal = activeStatuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-foreground">{stage.label}</h4>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {stage.total} total
        </span>
      </div>

      <div className="flex h-7 w-full overflow-hidden rounded-md bg-muted">
        {activeStatuses.map((s) => {
          const pct = activeTotal > 0 ? (s.count / activeTotal) * 100 : 0;
          return (
            <div
              key={s.key}
              className="flex items-center justify-center text-[11px] font-medium text-white transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                minWidth: s.count > 0 ? '2rem' : 0,
              }}
              title={`${s.label}: ${s.count}`}
            >
              {s.count > 0 && s.count}
            </div>
          );
        })}
        {activeTotal === 0 && (
          <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
            No active deals
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {stage.statuses.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-muted-foreground">
              {s.label}{' '}
              <span className="font-medium text-foreground">{s.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline
// ---------------------------------------------------------------------------

function formatTimelineDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ActivityTimeline({ notifications }: { notifications: Notification[] }) {
  const INITIAL_SHOW = 10;

  if (notifications.length === 0) {
    return (
      <Card className="border border-border-subtle">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold tracking-tight">Activity Timeline</h2>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            LOI and lease activity will appear here as negotiations progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border-subtle">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold tracking-tight">Activity Timeline</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{notifications.length} events</span>
            <RefreshButton />
          </div>
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          LOI and lease negotiation activity
        </p>

        <div className="mt-5 relative max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-subtle" />

          <ul className="space-y-0">
            {notifications.map((n, idx) => {
              const isUnread = !n.read;
              return (
                <li key={n.id} className="relative pl-8 pb-5 last:pb-0">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-[7px] top-1.5 h-[9px] w-[9px] rounded-full border-2',
                      isUnread
                        ? 'border-primary bg-primary'
                        : 'border-border bg-white'
                    )}
                  />

                  {n.link_url ? (
                    <Link href={n.link_url} className="group block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'text-[13px] transition-colors',
                            isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                            'group-hover:text-primary'
                          )}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">
                            {n.message}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatTimelineDate(n.created_at)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-[13px]',
                          isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                        )}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">
                          {n.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
                        {formatTimelineDate(n.created_at)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const user = await requireBrokerOrAdmin();

  const [
    { data: stats },
    { data: activity },
    { data: pipeline },
    { data: commission },
    { data: commissionTimeline },
    { data: dealFlowTimeline },
    { data: vacancy },
    { data: propertyAnalytics },
    { data: timelineNotifications },
  ] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
    getPipelineStats(),
    getCommissionSummary(),
    getCommissionTimeline(),
    getDealFlowTimeline(),
    getVacancyIntelligence(),
    getPropertyAnalytics(),
    getRecentNotifications(user.id, 100),
  ]);

  const statCards = [
    {
      label: 'Pending Applications',
      value: stats?.applications.submitted ?? 0,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary-subtle',
    },
    {
      label: 'Active LOIs',
      value: (stats?.lois.draft ?? 0) + (stats?.lois.in_negotiation ?? 0),
      icon: Handshake,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Executed Leases',
      value: stats?.leases.executed ?? 0,
      icon: ScrollText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Outstanding Invoices',
      value: stats?.invoices.sent ?? 0,
      icon: Receipt,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Overview of your deal flow pipeline
        </p>
      </div>

      {/* Stat cards — pipeline KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {statCards.map((stat) => (
          <Card key={stat.label} className="group border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', stat.bgColor)}>
                  <stat.icon className={cn('h-[18px] w-[18px]', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="mt-6">
        <ActivityTimeline notifications={timelineNotifications ?? []} />
      </div>

      {/* Commission Summary */}
      {commission && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <Card className="border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-[18px] w-[18px] text-success" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">Earned</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(commission.earned)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
                  <Clock className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">Outstanding</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(commission.outstanding)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <DollarSign className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">Pending</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(commission.pending)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
                  <TrendingUp className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">YTD Revenue</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums text-primary">
                    {formatCurrency(commission.ytd)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Charts */}
      {commissionTimeline && dealFlowTimeline && (
        <div className="mt-8">
          <DashboardCharts
            commissionTimeline={commissionTimeline}
            dealFlowTimeline={dealFlowTimeline}
          />
        </div>
      )}

      {/* Deal Pipeline */}
      {pipeline && (
        <Card className="mt-8 border border-border-subtle">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight">Deal Pipeline</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Active deals by stage and status
            </p>

            <div className="mt-5 space-y-5">
              <PipelineRow stage={pipeline.applications} />
              <div className="border-t border-border-subtle" />
              <PipelineRow stage={pipeline.lois} />
              <div className="border-t border-border-subtle" />
              <PipelineRow stage={pipeline.leases} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vacancy Intelligence */}
      {vacancy && (
        <div className="mt-8">
          <VacancyIntelligenceSection data={vacancy} />
        </div>
      )}

      {/* Property Performance */}
      {propertyAnalytics && propertyAnalytics.length > 0 && (
        <Card className="mt-8 border border-border-subtle">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold tracking-tight">Property Performance</h2>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Analytics across all properties, sorted by activity
            </p>
            <div className="mt-5">
              <PropertyPerformance analytics={propertyAnalytics} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="mt-8 border border-border-subtle">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Recent Activity</h2>

          {!activity || activity.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Activity feed will appear here as applications and deals come in.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border-subtle">
              {activity.map((item) => (
                <li key={`${item.entity_type}-${item.id}`} className="flex items-center justify-between py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
                      {' · '}
                      {formatRelativeDate(item.created_at)}
                    </p>
                  </div>
                  <Badge status={item.status} size="sm" className="ml-4 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
