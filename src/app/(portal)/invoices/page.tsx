// @ts-nocheck — Remove after running `supabase gen types typescript`
import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatCurrency } from '@/lib/utils';

export const metadata = {
  title: 'Invoices | Rocket Realty',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default async function InvoicesPage() {
  let invoices = null;
  try {
    const supabase = await createClient();
    const { data: result } = await supabase
      .from('commission_invoices')
      .select(`
        id, invoice_number, status, commission_amount, total_consideration,
        commission_rate_percent, sent_date, paid_date, payee_name
      `)
      .order('created_at', { ascending: false });
    invoices = result;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Commission Invoices</h1>
      <p className="mt-1 text-muted-foreground">
        Track commission invoices generated from executed leases.
      </p>

      {!invoices || invoices.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <Receipt className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-4">No invoices yet.</p>
          <p className="text-sm">Commission invoices are auto-generated when leases are executed.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Payee</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Total Consideration</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Commission</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.payee_name}</td>
                  <td className="px-4 py-3">{formatCurrency(inv.total_consideration)}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(inv.commission_amount)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({inv.commission_rate_percent}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.paid_date
                      ? `Paid ${formatDate(inv.paid_date)}`
                      : inv.sent_date
                        ? `Sent ${formatDate(inv.sent_date)}`
                        : 'Draft'}
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
