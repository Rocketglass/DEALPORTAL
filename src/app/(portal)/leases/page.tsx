// @ts-nocheck — Remove after running `supabase gen types typescript`
import Link from 'next/link';
import { ScrollText, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatCurrency } from '@/lib/utils';

export const metadata = {
  title: 'Leases | Rocket Realty',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-blue-100 text-blue-700',
  sent_for_signature: 'bg-amber-100 text-amber-700',
  partially_signed: 'bg-orange-100 text-orange-700',
  executed: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
};

export default async function LeasesPage() {
  let leases = null;
  try {
    const supabase = await createClient();
    const { data: result } = await supabase
      .from('leases')
      .select(`
        id, status, lessee_name, lessor_name, premises_address,
        commencement_date, expiration_date, base_rent_monthly, premises_sf,
        property:properties(name),
        unit:units(suite_number)
      `)
      .order('created_at', { ascending: false });
    leases = result;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Leases</h1>
      <p className="mt-1 text-muted-foreground">
        View and manage all lease agreements.
      </p>

      {!leases || leases.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <ScrollText className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-4">No leases yet.</p>
          <p className="text-sm">Leases are generated from agreed LOIs.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Rent</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Term</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leases.map((lease) => (
                  <tr key={lease.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {lease.property?.name}
                      {lease.unit && <span className="text-muted-foreground"> — Suite {lease.unit.suite_number}</span>}
                    </td>
                    <td className="px-4 py-3">{lease.lessee_name}</td>
                    <td className="px-4 py-3">{formatCurrency(lease.base_rent_monthly)}/mo</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(lease.commencement_date)} — {formatDate(lease.expiration_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[lease.status] || 'bg-gray-100 text-gray-700'}`}>
                        {lease.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/leases/${lease.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
