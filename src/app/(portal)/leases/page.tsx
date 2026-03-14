'use client';

import Link from 'next/link';
import { ScrollText, Eye } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';

const mockLeases = [
  {
    id: '1',
    property_name: 'El Cajon Business Park',
    unit_suite: '105',
    tenant: 'Sunrise Bakery LLC',
    base_rent_monthly: 3200,
    commencement_date: '2026-04-01',
    expiration_date: '2029-03-31',
    status: 'executed',
  },
  {
    id: '2',
    property_name: 'Santee Commerce Center',
    unit_suite: '210',
    tenant: 'Peak Fitness Studio',
    base_rent_monthly: 4800,
    commencement_date: '2026-05-01',
    expiration_date: '2031-04-30',
    status: 'sent_for_signature',
  },
  {
    id: '3',
    property_name: 'Lakeside Industrial Plaza',
    unit_suite: '301',
    tenant: 'Valley Auto Parts',
    base_rent_monthly: 5500,
    commencement_date: '2026-06-01',
    expiration_date: '2031-05-31',
    status: 'review',
  },
  {
    id: '4',
    property_name: 'Alpine Professional Center',
    unit_suite: '402',
    tenant: 'Mountain View Accounting',
    base_rent_monthly: 2800,
    commencement_date: '2025-01-01',
    expiration_date: '2027-12-31',
    status: 'executed',
  },
  {
    id: '5',
    property_name: 'El Cajon Business Park',
    unit_suite: '203',
    tenant: 'Coastal Coffee Co.',
    base_rent_monthly: 2400,
    commencement_date: '2023-06-01',
    expiration_date: '2026-05-31',
    status: 'expired',
  },
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'sent_for_signature', label: 'Sent for Signature' },
  { value: 'partially_signed', label: 'Partially Signed' },
  { value: 'executed', label: 'Executed' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
];

const columns = [
  {
    key: 'property_name',
    label: 'Property',
    render: (row: typeof mockLeases[0]) => (
      <span className="font-medium">
        {row.property_name}
        {row.unit_suite && (
          <span className="text-muted-foreground"> — Suite {row.unit_suite}</span>
        )}
      </span>
    ),
  },
  {
    key: 'tenant',
    label: 'Tenant',
    render: (row: typeof mockLeases[0]) => row.tenant,
  },
  {
    key: 'base_rent_monthly',
    label: 'Rent',
    sortable: true,
    render: (row: typeof mockLeases[0]) => (
      <span>{formatCurrency(row.base_rent_monthly)}/mo</span>
    ),
  },
  {
    key: 'expiration_date',
    label: 'Term',
    sortable: true,
    render: (row: typeof mockLeases[0]) => (
      <span className="text-muted-foreground">
        {formatDate(row.commencement_date)} — {formatDate(row.expiration_date)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: typeof mockLeases[0]) => <Badge status={row.status} />,
  },
  {
    key: '_actions',
    label: '',
    render: (row: typeof mockLeases[0]) => (
      <Link
        href={`/leases/${row.id}`}
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Link>
    ),
  },
];

export default function LeasesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Leases</h1>
      <p className="mt-1 text-muted-foreground">
        View and manage all lease agreements.
      </p>

      <DataTable
        data={mockLeases}
        columns={columns}
        searchKeys={['tenant', 'property_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by tenant or property..."
        emptyIcon={ScrollText}
        emptyMessage="No leases yet"
        emptyDescription="Leases are generated automatically from agreed LOIs, or you can create one manually."
        emptyActionLabel="Create Lease"
        emptyActionHref="/leases/new"
        pageSize={10}
      />
    </div>
  );
}
