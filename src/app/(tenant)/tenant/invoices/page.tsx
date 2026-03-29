import { Receipt } from 'lucide-react';
import { requireRole } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/service';
import type { InvoiceStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Invoices | Tenant Portal',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusBadge: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-blue-50 text-blue-700' },
  sent: { label: 'Sent', className: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', className: 'bg-green-50 text-green-700' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
};

interface InvoiceRow {
  id: string;
  invoice_number: string;
  commission_amount: number;
  total_consideration: number;
  status: string;
  created_at: string;
  due_date: string | null;
  lease: {
    id: string;
    lessee_name: string;
    premises_address: string;
  }[] | null;
}

export default async function TenantInvoicesPage() {
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : (user.principalId ?? user.contactId);

  if (!isBroker && !contactId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is not linked to a contact record yet. Please contact your broker.
          </p>
        </div>
      </div>
    );
  }

  let invoices: InvoiceRow[] = [];
  let error: string | null = null;

  try {
    const supabase = await createClient();

    // Get invoices for leases where this tenant is the lessee
    let query = supabase
      .from('commission_invoices')
      .select(`
        id,
        invoice_number,
        commission_amount,
        total_consideration,
        status,
        created_at,
        due_date,
        lease:leases!inner(id, lessee_name, premises_address, tenant_contact_id)
      `)
      .order('created_at', { ascending: false });

    if (contactId) {
      query = query.eq('lease.tenant_contact_id', contactId);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      error = queryError.message;
    }
    invoices = (data ?? []) as unknown as InvoiceRow[];
  } catch (err) {
    console.error('[TenantInvoices] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load invoices';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Invoices related to your leases
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load invoices. Please try refreshing the page.
        </div>
      )}

      {!error && (
        <div className="mt-6">
          {!invoices || invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No invoices yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Invoices will appear here once commissions are generated from your leases.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {invoices.map((invoice) => {
                    const lease = invoice.lease?.[0] ?? null;
                    const badge = statusBadge[invoice.status as InvoiceStatus] ?? statusBadge.draft;

                    return (
                      <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lease?.premises_address ?? '--'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {formatCurrency(invoice.total_consideration)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invoice.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
