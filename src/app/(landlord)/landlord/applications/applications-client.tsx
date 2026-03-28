'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { ApplicationWithRelations } from '@/types/database';

interface Props {
  applications: ApplicationWithRelations[];
  error: string | null;
}

export function ApplicationsClient({ applications, error }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return applications;
    const q = query.toLowerCase();
    return applications.filter(
      (app) =>
        app.business_name.toLowerCase().includes(q) ||
        (app.contact?.first_name ?? '').toLowerCase().includes(q) ||
        (app.contact?.last_name ?? '').toLowerCase().includes(q) ||
        (app.property?.name ?? '').toLowerCase().includes(q),
    );
  }, [applications, query]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Review applications for your properties.
          </p>
        </div>
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load applications. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Review applications for your properties.
        </p>
      </div>

      {/* Search */}
      {applications.length > 0 && (
        <div className="mt-5 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by business or applicant name..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-[13px] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Table */}
      <div className="mt-5">
        {applications.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-[14px] font-medium text-foreground">No applications yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Applications for your properties will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          /* No search results */
          <div className="rounded-xl border border-border-subtle bg-muted/20 p-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              No applications match &ldquo;{query}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle bg-muted/40">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Business
                  </th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Applicant
                  </th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                    Property
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                    Submitted
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-white">
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="transition-colors duration-100 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-foreground">
                        {app.business_name}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div>
                        <span className="text-[13px] text-foreground">
                          {app.contact?.first_name} {app.contact?.last_name}
                        </span>
                        {app.contact?.email && (
                          <p className="text-[11px] text-muted-foreground">{app.contact.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-[13px] text-foreground">
                        {app.property?.name ?? '—'}
                        {app.unit?.suite_number && (
                          <span className="text-muted-foreground">
                            {' '}— Suite {app.unit.suite_number}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={app.status} size="sm" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-[12px] text-muted-foreground">
                        {formatDate(app.submitted_at ?? app.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/landlord/applications/${app.id}`}
                        className="inline-flex items-center gap-1 text-[12px] text-primary transition-colors duration-150 hover:text-primary-light"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
