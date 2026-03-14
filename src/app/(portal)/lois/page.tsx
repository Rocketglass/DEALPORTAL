// @ts-nocheck — Remove after running `supabase gen types typescript`
import Link from 'next/link';
import { Handshake, Eye, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = {
  title: 'LOIs | Rocket Realty',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  in_negotiation: 'bg-amber-100 text-amber-700',
  agreed: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

export default async function LoisPage() {
  let lois = null;
  try {
    const supabase = await createClient();
    const { data: result } = await supabase
      .from('lois')
      .select(`
        id, status, version, sent_at, created_at,
        property:properties(name),
        unit:units(suite_number),
        tenant:contacts!lois_tenant_contact_id_fkey(first_name, last_name, company_name),
        landlord:contacts!lois_landlord_contact_id_fkey(first_name, last_name, company_name)
      `)
      .order('created_at', { ascending: false });
    lois = result;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Letters of Intent</h1>
          <p className="mt-1 text-muted-foreground">
            Draft, send, and negotiate LOIs with landlords.
          </p>
        </div>
        <Link
          href="/lois/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
        >
          <Plus className="h-4 w-4" />
          Create LOI
        </Link>
      </div>

      {!lois || lois.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <Handshake className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-4">No LOIs yet.</p>
          <p className="text-sm">Create an LOI from an approved application to start negotiating.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Landlord</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lois.map((loi) => (
                  <tr key={loi.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {loi.property?.name}
                      {loi.unit && <span className="text-muted-foreground"> — Suite {loi.unit.suite_number}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {loi.tenant?.company_name || `${loi.tenant?.first_name} ${loi.tenant?.last_name}`}
                    </td>
                    <td className="px-4 py-3">
                      {loi.landlord?.company_name || `${loi.landlord?.first_name} ${loi.landlord?.last_name}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[loi.status] || 'bg-gray-100 text-gray-700'}`}>
                        {loi.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(loi.sent_at || loi.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/lois/${loi.id}`}
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
