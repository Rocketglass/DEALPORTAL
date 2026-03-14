// @ts-nocheck — Remove after running `supabase gen types typescript`
'use client';

import Link from 'next/link';
import { Handshake, Eye, Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  in_negotiation: 'bg-amber-100 text-amber-700',
  agreed: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

const mockLois = [
  {
    id: '1',
    property_name: 'El Cajon Business Park — Suite 105',
    tenant_name: 'Sunrise Bakery LLC',
    landlord_name: 'East County Properties Inc.',
    status: 'in_negotiation',
    date: '2026-03-09',
  },
  {
    id: '2',
    property_name: 'Santee Commerce Center — Suite 210',
    tenant_name: 'Peak Fitness Studio',
    landlord_name: 'Santee Holdings Group',
    status: 'sent',
    date: '2026-03-07',
  },
  {
    id: '3',
    property_name: 'Lakeside Industrial Plaza — Suite 301',
    tenant_name: 'Valley Auto Parts',
    landlord_name: 'Lakeside Investments LLC',
    status: 'agreed',
    date: '2026-03-01',
  },
  {
    id: '4',
    property_name: 'Alpine Professional Center — Suite 102',
    tenant_name: 'Mountain View Accounting',
    landlord_name: 'Alpine Real Estate Trust',
    status: 'draft',
    date: '2026-03-11',
  },
  {
    id: '5',
    property_name: 'El Cajon Business Park — Suite 203',
    tenant_name: 'San Diego Tech Solutions',
    landlord_name: 'East County Properties Inc.',
    status: 'rejected',
    date: '2026-02-25',
  },
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_negotiation', label: 'In Negotiation' },
  { value: 'agreed', label: 'Agreed' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const columns = [
  {
    key: 'property_name',
    label: 'Property',
    sortable: true,
    render: (row: typeof mockLois[0]) => (
      <span className="font-medium">{row.property_name}</span>
    ),
  },
  {
    key: 'tenant_name',
    label: 'Tenant',
    render: (row: typeof mockLois[0]) => row.tenant_name,
  },
  {
    key: 'landlord_name',
    label: 'Landlord',
    render: (row: typeof mockLois[0]) => row.landlord_name,
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: typeof mockLois[0]) => (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}
      >
        {row.status.replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (row: typeof mockLois[0]) => (
      <span className="text-muted-foreground">{formatDate(row.date)}</span>
    ),
  },
  {
    key: '_actions',
    label: '',
    render: (row: typeof mockLois[0]) => (
      <Link
        href={`/lois/${row.id}`}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Link>
    ),
  },
];

export default function LoisPage() {
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

      <DataTable
        data={mockLois}
        columns={columns}
        searchKeys={['property_name', 'tenant_name', 'landlord_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by property, tenant, or landlord..."
        emptyIcon={Handshake}
        emptyMessage="No LOIs yet."
        pageSize={10}
      />
    </div>
  );
}
