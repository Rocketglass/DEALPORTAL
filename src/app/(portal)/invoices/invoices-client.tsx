'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Send, XCircle } from 'lucide-react';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { CommissionInvoice } from '@/types/database';

interface InvoiceWithLease extends CommissionInvoice {
  lease: {
    id: string;
    lessee_name: string;
    lessor_name: string;
    premises_address: string;
    premises_city: string;
    premises_state: string;
  } | null;
}

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const columns = [
  {
    key: 'invoice_number',
    label: 'Invoice #',
    render: (row: InvoiceWithLease) => (
      <span className="font-medium">{row.invoice_number}</span>
    ),
  },
  {
    key: 'payee_name',
    label: 'Payee',
    render: (row: InvoiceWithLease) =>
      row.payee_name ?? row.lease?.lessor_name ?? '—',
  },
  {
    key: 'total_consideration',
    label: 'Total Consideration',
    sortable: true,
    render: (row: InvoiceWithLease) => formatCurrency(row.total_consideration),
  },
  {
    key: 'commission_amount',
    label: 'Commission',
    sortable: true,
    render: (row: InvoiceWithLease) => (
      <span>
        {formatCurrency(row.commission_amount)}
        <span className="ml-1 text-xs text-muted-foreground">
          ({row.commission_rate_percent}%)
        </span>
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: InvoiceWithLease) => <Badge status={row.status} />,
  },
  {
    key: 'sent_date',
    label: 'Date',
    sortable: true,
    render: (row: InvoiceWithLease) => (
      <span className="text-muted-foreground">
        {row.paid_date
          ? `Paid ${formatDate(row.paid_date)}`
          : row.sent_date
            ? `Sent ${formatDate(row.sent_date)}`
            : 'Draft'}
      </span>
    ),
  },
];

interface Props {
  invoices: InvoiceWithLease[];
  error: string | null;
}

export function InvoicesClient({ invoices, error }: Props) {
  const router = useRouter();

  const handleBulkStatus = useCallback(
    async (ids: string[], status: string) => {
      await fetch('/api/invoices/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      router.refresh();
    },
    [router],
  );

  const bulkActions: BulkAction[] = [
    {
      label: 'Send Selected',
      icon: Send,
      variant: 'primary',
      onClick: (ids) => handleBulkStatus(ids, 'sent'),
    },
    {
      label: 'Cancel Selected',
      icon: XCircle,
      variant: 'destructive',
      onClick: (ids) => handleBulkStatus(ids, 'cancelled'),
    },
  ];

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Commission Invoices</h1>
        <p className="mt-4 text-sm text-destructive">
          Failed to load invoices: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Commission Invoices</h1>
      <p className="mt-1 text-muted-foreground">
        Track commission invoices generated from executed leases.
      </p>

      <DataTable
        data={invoices}
        columns={columns}
        searchKeys={['invoice_number', 'payee_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by invoice number or payee..."
        emptyIcon={Receipt}
        emptyMessage="No invoices yet"
        emptyDescription="Commission invoices are generated automatically when leases are executed."
        pageSize={10}
        exportFileName="invoices"
        selectable
        bulkActions={bulkActions}
      />
    </div>
  );
}
