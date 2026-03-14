'use client';

import Link from 'next/link';
import { FileText, Eye } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const mockApplications = [
  {
    id: '1',
    business_name: 'Sunrise Bakery LLC',
    contact_first: 'Maria',
    contact_last: 'Santos',
    contact_email: 'maria@sunrisebakery.com',
    property_name: 'El Cajon Business Park',
    unit_suite: '105',
    status: 'submitted',
    date: '2026-03-10',
  },
  {
    id: '2',
    business_name: 'Peak Fitness Studio',
    contact_first: 'James',
    contact_last: 'Chen',
    contact_email: 'james@peakfitness.com',
    property_name: 'Santee Commerce Center',
    unit_suite: '210',
    status: 'under_review',
    date: '2026-03-08',
  },
  {
    id: '3',
    business_name: 'Valley Auto Parts',
    contact_first: 'Robert',
    contact_last: 'Williams',
    contact_email: 'rwilliams@valleyauto.com',
    property_name: 'Lakeside Industrial Plaza',
    unit_suite: '301',
    status: 'approved',
    date: '2026-03-05',
  },
  {
    id: '4',
    business_name: 'Golden Dragon Restaurant',
    contact_first: 'Wei',
    contact_last: 'Liu',
    contact_email: 'wei@goldendragon.com',
    property_name: 'El Cajon Business Park',
    unit_suite: '108',
    status: 'draft',
    date: '2026-03-12',
  },
  {
    id: '5',
    business_name: 'Bright Smiles Dental',
    contact_first: 'Sarah',
    contact_last: 'Johnson',
    contact_email: 'sarah@brightsmiles.com',
    property_name: 'Santee Commerce Center',
    unit_suite: '115',
    status: 'rejected',
    date: '2026-02-28',
  },
  {
    id: '6',
    business_name: 'Mountain View Accounting',
    contact_first: 'David',
    contact_last: 'Park',
    contact_email: 'david@mvaccounting.com',
    property_name: 'Alpine Professional Center',
    unit_suite: '402',
    status: 'info_requested',
    date: '2026-03-06',
  },
];

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
    render: (row: typeof mockApplications[0]) => (
      <span className="font-medium">{row.business_name}</span>
    ),
  },
  {
    key: 'contact_last',
    label: 'Applicant',
    render: (row: typeof mockApplications[0]) => (
      <div>
        {row.contact_first} {row.contact_last}
        <br />
        <span className="text-xs text-muted-foreground">{row.contact_email}</span>
      </div>
    ),
  },
  {
    key: 'property_name',
    label: 'Property',
    render: (row: typeof mockApplications[0]) => (
      <span>
        {row.property_name}
        {row.unit_suite && (
          <span className="text-muted-foreground"> — Suite {row.unit_suite}</span>
        )}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row: typeof mockApplications[0]) => (
      <Badge status={row.status} />
    ),
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (row: typeof mockApplications[0]) => (
      <span className="text-muted-foreground">{formatDate(row.date)}</span>
    ),
  },
  {
    key: '_actions',
    label: '',
    render: (row: typeof mockApplications[0]) => (
      <Link
        href={`/applications/${row.id}/review`}
        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
      >
        <Eye className="h-3.5 w-3.5" /> Review
      </Link>
    ),
  },
];

export default function ApplicationsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Review and manage tenant applications.
          </p>
        </div>
      </div>

      <DataTable
        data={mockApplications}
        columns={columns}
        searchKeys={['business_name', 'contact_first', 'contact_last']}
        filters={[{ key: 'status', label: 'Status', options: statusOptions }]}
        searchPlaceholder="Search by business or contact name..."
        emptyIcon={FileText}
        emptyMessage="No applications yet"
        emptyDescription="Applications will appear here as prospective tenants submit them through the property listing pages."
        pageSize={10}
      />
    </div>
  );
}
