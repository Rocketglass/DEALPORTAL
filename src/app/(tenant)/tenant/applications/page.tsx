import Link from 'next/link';
import { FileText } from 'lucide-react';
import { requireRole } from '@/lib/security/auth-guard';
import { getTenantApplications } from '@/lib/queries/tenant';
import type { ApplicationStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Applications | Tenant Portal',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

const statusBadge: Record<ApplicationStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  under_review: { label: 'Under Review', className: 'bg-amber-50 text-amber-700' },
  info_requested: { label: 'Info Requested', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-600' },
};

export default async function TenantApplicationsPage() {
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : (user.principalId ?? user.contactId);

  if (!isBroker && !contactId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is not linked to a contact record yet. Please contact your broker.
          </p>
        </div>
      </div>
    );
  }

  let applications: Awaited<ReturnType<typeof getTenantApplications>>['data'] = null;
  let error: string | null = null;
  try {
    const result = await getTenantApplications(contactId);
    applications = result.data;
    error = result.error;
  } catch (err) {
    console.error('[TenantApplications] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track the status of your lease applications
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load applications. Please try refreshing the page.
        </div>
      )}

      {!error && (
        <div className="mt-6">
          {!applications || applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No applications yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Apply for a space to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Business Name</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {applications.map((app) => {
                    const badge = statusBadge[app.status] ?? statusBadge.submitted;

                    return (
                      <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {app.businessName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {app.propertyName}
                          {app.suiteName ? ` \u00b7 Suite ${app.suiteName}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {app.submittedAt ? formatDate(app.submittedAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/tenant/dashboard"
                            className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
