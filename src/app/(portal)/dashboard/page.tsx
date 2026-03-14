import { FileText, Handshake, ScrollText, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Dashboard | Rocket Realty',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: applicationCount },
    { count: loiCount },
    { count: activeLeaseCount },
    { count: invoiceCount },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('lois').select('*', { count: 'exact', head: true }).in('status', ['sent', 'in_negotiation']),
    supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'executed'),
    supabase.from('commission_invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ]);

  const stats = [
    { label: 'Pending Applications', value: applicationCount ?? 0, icon: FileText, color: 'text-blue-600' },
    { label: 'Active LOIs', value: loiCount ?? 0, icon: Handshake, color: 'text-amber-600' },
    { label: 'Executed Leases', value: activeLeaseCount ?? 0, icon: ScrollText, color: 'text-green-600' },
    { label: 'Outstanding Invoices', value: invoiceCount ?? 0, icon: Receipt, color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your deal flow pipeline.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
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
