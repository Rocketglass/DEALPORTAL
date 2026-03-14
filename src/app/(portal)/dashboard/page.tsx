import { FileText, Handshake, ScrollText, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getDashboardStats, getRecentActivity } from '@/lib/queries/dashboard';

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

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  in_negotiation: 'bg-amber-100 text-amber-700',
  agreed: 'bg-green-100 text-green-700',
  sent_for_signature: 'bg-blue-100 text-blue-700',
  executed: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

export default async function DashboardPage() {
  const [{ data: stats }, { data: activity }] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);

  const statCards = [
    {
      label: 'Pending Applications',
      value: stats?.applications.submitted ?? 0,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      label: 'Active LOIs',
      value: (stats?.lois.draft ?? 0) + (stats?.lois.in_negotiation ?? 0),
      icon: Handshake,
      color: 'text-amber-600',
    },
    {
      label: 'Executed Leases',
      value: stats?.leases.executed ?? 0,
      icon: ScrollText,
      color: 'text-green-600',
    },
    {
      label: 'Outstanding Invoices',
      value: stats?.invoices.sent ?? 0,
      icon: Receipt,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your deal flow pipeline.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="transition-shadow duration-150 hover:shadow-md">
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold">Recent Activity</h2>

          {!activity || activity.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Activity feed will appear here as applications and deals come in.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {activity.map((item) => (
                <li key={`${item.entity_type}-${item.id}`} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
                      {' · '}
                      {formatRelativeDate(item.created_at)}
                    </p>
                  </div>
                  <span
                    className={`ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formatStatus(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
