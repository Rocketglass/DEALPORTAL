// @ts-nocheck — Remove after running `supabase gen types typescript`
'use client';

import { Receipt } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { formatDate, formatCurrency } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV-2026-001',
    payee_name: 'East County Properties Inc.',
    total_consideration: 384000,
    commission_amount: 19200,
    commission_rate_percent: 5,
    status: 'paid',
    sent_date: '2026-03-01',
    paid_date: '2026-03-08',
  },
  {
    id: '2',
    invoice_number: 'INV-2026-002',
    payee_name: 'Santee Holdings Group',
    total_consideration: 576000,
    commission_amount: 28800,
    commission_rate_percent: 5,
    status: 'sent',
    sent_date: '2026-03-05',
    paid_date: null,
  },
  {
    id: '3',
    invoice_number: 'INV-2026-003',
    payee_name: 'Lakeside Investments LLC',
    total_consideration: 660000,
    commission_amount: 33000,
    commission_rate_percent: 5,
    status: 'draft',
    sent_date: null,
    paid_date: null,
  },
  {
    id: '4',
    invoice_number: 'INV-2025-018',
    payee_name: 'Alpine Real Estate Trust',
    total_consideration: 201600,
    commission_amount: 10080,
    commission_rate_percent: 5,
    status: 'overdue',
    sent_date: '2026-01-15',
    paid_date: null,
  },
  {
    id: '5',
    invoice_number: 'INV-2025-012',
    payee_name: 'East County Properties Inc.',
    total_consideration: 288000,
    commission_amount: 14400,
    commission_rate_percent: 5,
    status: 'paid',
    sent_date: '2025-10-01',
    paid_date: '2025-10-20',
  },
];

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
    render: (row: typeof mockInvoices[0]) => (
      <span className="font-medium">{row.invoice_number}</span>
    ),
  },
  {
    key: 'payee_name',
    label: 'Payee',
    render: (row: typeof mockInvoices[0]) => row.payee_name,
  },
  {
    key: 'total_consideration',
    label: 'Total Consideration',
    sortable: true,
    render: (row: typeof mockInvoices[0]) => formatCurrency(row.total_consideration),
  },
  {
    key: 'commission_amount',
    label: 'Commission',
    sortable: true,
    render: (row: typeof mockInvoices[0]) => (
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
    render: (row: typeof mockInvoices[0]) => (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: 'sent_date',
    label: 'Date',
    sortable: true,
    render: (row: typeof mockInvoices[0]) => (
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

export default function InvoicesPage() {
  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Commission Invoices</h1>
      <p className="mt-1 text-muted-foreground">
        Track commission invoices generated from executed leases.
      </p>

      <DataTable
        data={mockInvoices}
        columns={columns}
        searchKeys={['invoice_number', 'payee_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by invoice number or payee..."
        emptyIcon={Receipt}
        emptyMessage="No invoices yet."
        pageSize={10}
      />
    </div>
  );
}
