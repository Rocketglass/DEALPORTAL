'use client';

import Link from 'next/link';
import { ScrollText, Eye } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { LeaseWithRelations } from '@/types/database';

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
    render: (row: LeaseWithRelations) => (
      <span className="font-medium">
        {row.property?.name ?? row.premises_address}
        {row.unit?.suite_number && (
          <span className="text-muted-foreground"> — Suite {row.unit.suite_number}</span>
        )}
      </span>
    ),
  },
  {
    key: 'lessee_name',
    label: 'Tenant',
    render: (row: LeaseWithRelations) => {
      if (row.tenant?.company_name) return row.tenant.company_name;
      if (row.tenant?.first_name || row.tenant?.last_name) {
        return `${row.tenant.first_name ?? ''} ${row.tenant.last_name ?? ''}`.trim();
      }
      return row.lessee_name;
    },
  },
  {
    key: 'base_rent_monthly',
    label: 'Rent',
    sortable: true,
    render: (row: LeaseWithRelations) => (
      <span>{formatCurrency(row.base_rent_monthly)}/mo</span>
    ),
  },
  {
    key: 'expiration_date',
    label: 'Term',
    sortable: true,
    render: (row: LeaseWithRelations) => (
      <span className="text-muted-foreground">
        {formatDate(row.commencement_date)} — {formatDate(row.expiration_date)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: LeaseWithRelations) => <Badge status={row.status} />,
  },
  {
    key: '_actions',
    label: '',
    render: (row: LeaseWithRelations) => (
      <Link
        href={`/leases/${row.id}`}
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Link>
    ),
  },
];

interface Props {
  leases: LeaseWithRelations[];
  error: string | null;
}

export function LeasesClient({ leases, error }: Props) {
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Leases</h1>
        <p className="mt-4 text-sm text-destructive">
          Failed to load leases: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Leases</h1>
      <p className="mt-1 text-muted-foreground">
        View and manage all lease agreements.
      </p>

      <DataTable
        data={leases}
        columns={columns}
        searchKeys={['lessee_name', 'premises_address', 'property.name', 'tenant.company_name']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by tenant or property..."
        emptyIcon={ScrollText}
        emptyMessage="No leases yet"
        emptyDescription="Leases are generated automatically from agreed LOIs, or you can create one manually."
        emptyActionLabel="Create Lease"
        emptyActionHref="/leases/new"
        pageSize={10}
        exportFileName="leases"
      />
    </div>
  );
}
