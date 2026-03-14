'use client';

import Link from 'next/link';
import { FileText, Eye } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { ApplicationWithRelations } from '@/types/database';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'info_requested', label: 'Info Requested' },
];

const columns = [
  {
    key: 'business_name',
    label: 'Business',
    sortable: true,
    render: (row: ApplicationWithRelations) => (
      <span className="font-medium">{row.business_name}</span>
    ),
  },
  {
    key: 'contact_last',
    label: 'Applicant',
    render: (row: ApplicationWithRelations) => (
      <div>
        {row.contact?.first_name} {row.contact?.last_name}
        <br />
        <span className="text-xs text-muted-foreground">{row.contact?.email}</span>
      </div>
    ),
  },
  {
    key: 'property_name',
    label: 'Property',
    render: (row: ApplicationWithRelations) => (
      <span>
        {row.property?.name}
        {row.unit?.suite_number && (
          <span className="text-muted-foreground"> — Suite {row.unit.suite_number}</span>
        )}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: ApplicationWithRelations) => (
      <Badge status={row.status} />
    ),
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row: ApplicationWithRelations) => (
      <span className="text-muted-foreground">
        {formatDate(row.submitted_at ?? row.created_at)}
      </span>
    ),
  },
  {
    key: '_actions',
    label: '',
    render: (row: ApplicationWithRelations) => (
      <Link
        href={`/applications/${row.id}/review`}
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> Review
      </Link>
    ),
  },
];

interface Props {
  applications: ApplicationWithRelations[];
  error: string | null;
}

export function ApplicationsClient({ applications, error }: Props) {
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Review and manage tenant applications.
          </p>
        </div>
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load applications. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="mt-1 text-muted-foreground">
          Review and manage tenant applications.
        </p>
      </div>

      <DataTable
        data={applications}
        columns={columns}
        searchKeys={['business_name', 'contact_first', 'contact_last']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by business or contact name..."
        emptyIcon={FileText}
        emptyMessage="No applications yet"
        emptyDescription="Applications will appear here as prospective tenants submit them through the property listing pages."
        pageSize={10}
        exportFileName="applications"
      />
    </div>
  );
}
