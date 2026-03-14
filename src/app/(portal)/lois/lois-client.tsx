'use client';

import Link from 'next/link';
import { Handshake, Eye, Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { LoiWithRelations } from '@/types/database';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_negotiation', label: 'In Negotiation' },
  { value: 'agreed', label: 'Agreed' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function getTenantName(loi: LoiWithRelations): string {
  if (!loi.tenant) return '—';
  if (loi.tenant.company_name) return loi.tenant.company_name;
  const parts = [loi.tenant.first_name, loi.tenant.last_name].filter(Boolean);
  return parts.join(' ') || '—';
}

function getLandlordName(loi: LoiWithRelations): string {
  if (!loi.landlord) return '—';
  if (loi.landlord.company_name) return loi.landlord.company_name;
  const parts = [loi.landlord.first_name, loi.landlord.last_name].filter(Boolean);
  return parts.join(' ') || '—';
}

function getPropertyLabel(loi: LoiWithRelations): string {
  const name = loi.property?.name ?? loi.property_id;
  const suite = loi.unit?.suite_number;
  return suite ? `${name} — Suite ${suite}` : name;
}

const columns = [
  {
    key: 'property_name',
    label: 'Property',
    sortable: true,
    render: (row: LoiWithRelations) => (
      <span className="font-medium">{getPropertyLabel(row)}</span>
    ),
  },
  {
    key: 'tenant_name',
    label: 'Tenant',
    render: (row: LoiWithRelations) => getTenantName(row),
  },
  {
    key: 'landlord_name',
    label: 'Landlord',
    render: (row: LoiWithRelations) => getLandlordName(row),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: LoiWithRelations) => <Badge status={row.status} />,
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row: LoiWithRelations) => (
      <span className="text-muted-foreground">
        {formatDate(row.sent_at ?? row.created_at)}
      </span>
    ),
  },
  {
    key: '_actions',
    label: '',
    render: (row: LoiWithRelations) => (
      <Link
        href={`/lois/${row.id}`}
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Link>
    ),
  },
];

interface Props {
  lois: LoiWithRelations[];
  error: string | null;
}

export function LoisClient({ lois, error }: Props) {
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Letters of Intent</h1>
        <p className="mt-4 text-sm text-destructive">
          Failed to load LOIs: {error}
        </p>
      </div>
    );
  }

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
        data={lois}
        columns={columns}
        searchKeys={['property.name', 'tenant.company_name', 'landlord.company_name', 'status']}
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
