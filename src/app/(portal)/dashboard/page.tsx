import { FileText, Handshake, ScrollText, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Dashboard | Rocket Realty',
};

export default async function DashboardPage() {
  let applicationCount = 0;
  let loiCount = 0;
  let activeLeaseCount = 0;
  let invoiceCount = 0;

  try {
    const supabase = await createClient();

    const [
      { count: appCount },
      { count: lCount },
      { count: leaseCount },
      { count: invCount },
    ] = await Promise.all([
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('lois').select('*', { count: 'exact', head: true }).in('status', ['sent', 'in_negotiation']),
      supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'executed'),
      supabase.from('commission_invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    ]);

    applicationCount = appCount ?? 0;
    loiCount = lCount ?? 0;
    activeLeaseCount = leaseCount ?? 0;
    invoiceCount = invCount ?? 0;
  } catch {
    // Supabase not configured
  }

  const stats = [
    { label: 'Pending Applications', value: applicationCount, icon: FileText, color: 'text-blue-600' },
    { label: 'Active LOIs', value: loiCount, icon: Handshake, color: 'text-amber-600' },
    { label: 'Executed Leases', value: activeLeaseCount, icon: ScrollText, color: 'text-green-600' },
    { label: 'Outstanding Invoices', value: invoiceCount, icon: Receipt, color: 'text-purple-600' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your deal flow pipeline.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder — will be built out in Phase 2 */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Activity feed will appear here as applications and deals come in.
        </p>
      </div>
    </div>
  );
}
