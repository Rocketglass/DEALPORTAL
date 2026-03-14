'use client';

import Link from 'next/link';
import { Handshake, Eye, Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

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
    render: (row: typeof mockLois[0]) => <Badge status={row.status} />,
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
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Link>
    ),
  },
];

export default function LoisPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Letters of Intent</h1>
          <p className="mt-1 text-muted-foreground">
            Draft, send, and negotiate LOIs with landlords.
          </p>
        </div>
        <Link href="/lois/new">
          <Button variant="primary" icon={Plus}>
            Create LOI
          </Button>
        </Link>
      </div>

      <DataTable
        data={mockLois}
        columns={columns}
        searchKeys={['property_name', 'tenant_name', 'landlord_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by property, tenant, or landlord..."
        emptyIcon={Handshake}
        emptyMessage="No letters of intent yet"
        emptyDescription="Create your first LOI to begin negotiating lease terms with a landlord."
        emptyActionLabel="Create LOI"
        emptyActionHref="/lois/new"
        pageSize={10}
      />
    </div>
  );
}
