'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  XCircle,
  Check,
  Bell,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import type {
  ApplicationStatus,
  LoiStatus,
  LoiSectionStatus,
  LeaseStatus,
} from '@/types/database';
import type { TenantApplicationWithDeal } from '@/lib/queries/tenant';
import type { Notification } from '@/lib/queries/notifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// ---------------------------------------------------------------------------
// Application progress stepper
// ---------------------------------------------------------------------------

type StatusStep = {
  key: ApplicationStatus;
  label: string;
};

const statusSteps: StatusStep[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Decision' },
];

function getStepIndex(status: ApplicationStatus): number {
  if (status === 'submitted') return 0;
  if (status === 'under_review' || status === 'info_requested') return 1;
  if (status === 'approved' || status === 'rejected') return 2;
  return 0;
}

function ProgressStepper({ status }: { status: ApplicationStatus }) {
  const currentStep = getStepIndex(status);
  const isRejected = status === 'rejected';

  return (
    <div className="flex items-center gap-0">
      {statusSteps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isLast = idx === statusSteps.length - 1;
        const isFinalRejected = isLast && isRejected && isCurrent;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'border-[var(--success)] bg-[var(--success)] text-white'
                    : isCurrent && !isFinalRejected
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                    : isFinalRejected
                    ? 'border-[var(--destructive)] bg-[var(--destructive)] text-white'
                    : 'border-[var(--border)] bg-white text-[var(--muted-foreground)]'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isFinalRejected ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  isCompleted || isCurrent
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)]'
                }`}
              >
                {isLast && isRejected
                  ? 'Rejected'
                  : isLast && status === 'approved'
                  ? 'Approved'
                  : step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-2 h-0.5 w-10 sm:w-16 ${
                  isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-700' },
  under_review: { label: 'Under Review', className: 'bg-amber-50 text-amber-700' },
  info_requested: { label: 'Info Requested', className: 'bg-orange-50 text-orange-700' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-600' },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusBadgeConfig[status] ?? statusBadgeConfig.submitted;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LOI section progress bar
// ---------------------------------------------------------------------------

const sectionColors: Record<LoiSectionStatus, string> = {
  accepted: 'bg-green-500',
  countered: 'bg-amber-400',
  rejected: 'bg-red-400',
  proposed: 'bg-gray-200',
};

function LoiSectionProgress({
  sections,
}: {
  sections: { key: string; status: LoiSectionStatus }[];
}) {
  if (sections.length === 0) return null;

  const acceptedCount = sections.filter((s) => s.status === 'accepted').length;
  const total = sections.length;
  const allAgreed = acceptedCount === total;

  return (
    <div className="mt-2">
      {/* Section bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {sections.map((section, idx) => (
          <div
            key={`${section.key}-${idx}`}
            className={`flex-1 transition-colors ${sectionColors[section.status]}`}
            style={{ marginRight: idx < sections.length - 1 ? '1px' : 0 }}
            title={`${section.key}: ${section.status}`}
          />
        ))}
      </div>
      {/* Section count label */}
      <p
        className={`mt-1 text-xs font-medium ${
          allAgreed ? 'text-green-600' : 'text-[var(--muted-foreground)]'
        }`}
      >
        {allAgreed
          ? 'All sections agreed'
          : `${acceptedCount} of ${total} sections agreed`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LOI status label
// ---------------------------------------------------------------------------

function loiStatusLabel(status: LoiStatus): string {
  const labels: Record<LoiStatus, string> = {
    draft: 'Being prepared',
    sent: 'Sent to landlord',
    in_negotiation: 'Under negotiation',
    agreed: 'All terms agreed',
    expired: 'Expired',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Lease status label
// ---------------------------------------------------------------------------

function leaseStatusLabel(status: LeaseStatus): string {
  const labels: Record<LeaseStatus, string> = {
    draft: 'Being prepared',
    review: 'Under review',
    sent_for_signature: 'Sent for signature',
    partially_signed: 'Partially signed',
    executed: 'Fully executed',
    expired: 'Expired',
    terminated: 'Terminated',
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Application card
// ---------------------------------------------------------------------------

function getApplicationLink(application: TenantApplicationWithDeal): string {
  if (application.lease) return `/tenant/leases/${application.lease.id}`;
  if (application.loi) return `/tenant/lois/${application.loi.id}`;
  return '/tenant/applications';
}

function ApplicationCard({
  application,
}: {
  application: TenantApplicationWithDeal;
}) {
  const { status, loi, lease } = application;
  const isApproved = status === 'approved';
  const isInfoRequested = status === 'info_requested';
  const isRejected = status === 'rejected';
  const showDealPipeline = isApproved && (loi !== null || lease !== null);
  const href = getApplicationLink(application);

  return (
    <Link href={href} className="block rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row: business name + status badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{application.businessName}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            <Building2 className="mr-1 inline h-3.5 w-3.5" />
            {application.propertyName}
            {application.suiteName ? ` · Suite ${application.suiteName}` : ''}
          </p>
          {application.submittedAt && (
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Submitted {formatDate(application.submittedAt)}
            </p>
          )}
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Application progress stepper */}
      <div className="mt-8 flex justify-center">
        <ProgressStepper status={application.status} />
      </div>

      {/* Info requested banner */}
      {isInfoRequested && (
        <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                Additional information requested
              </p>
              <p className="mt-1 text-sm text-orange-700">
                Your broker needs more information to proceed. Please contact them directly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approved with no LOI yet banner */}
      {isApproved && !loi && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Application approved
              </p>
              <p className="mt-1 text-sm text-green-700">
                Next steps: A Letter of Intent (LOI) will be sent to the landlord for review.
                Your broker will reach out with details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deal pipeline */}
      {showDealPipeline && (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Deal Progress
          </h3>

          <div className="mt-4 space-y-4">
            {/* LOI status row */}
            {loi && (
              <div>
                <div className="flex items-start gap-3">
                  {loi.status === 'agreed' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                  ) : (
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Letter of Intent
                      {' — '}
                      {loiStatusLabel(loi.status)}
                    </p>
                    {loi.sentAt && (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        Sent {formatDate(loi.sentAt)}
                        {loi.agreedAt && ` · Agreed ${formatDate(loi.agreedAt)}`}
                      </p>
                    )}
                    {/* LOI section-level progress */}
                    {loi.sections.length > 0 && (
                      <LoiSectionProgress sections={loi.sections} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Lease status row */}
            {lease && (
              <div className="flex items-start gap-3">
                {lease.status === 'executed' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                ) : (
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Lease
                    {' — '}
                    {leaseStatusLabel(lease.status)}
                  </p>
                  {(lease.status === 'sent_for_signature' ||
                    lease.status === 'partially_signed') &&
                    lease.docusignStatus && (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        DocuSign: {lease.docusignStatus}
                      </p>
                    )}
                  {lease.signedDate && (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Signed {formatDate(lease.signedDate)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pending stages: LOI exists but not agreed, no lease yet */}
            {loi && !lease && loi.status !== 'agreed' && (
              <div className="flex items-center gap-3 opacity-40">
                <div className="h-5 w-5 rounded-full border-2 border-[var(--border)]" />
                <p className="text-sm">Lease — Pending LOI agreement</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Application not approved
              </p>
              <p className="mt-1 text-sm text-red-700">
                If you have questions, please contact your broker for more information.
              </p>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Notification time formatting
// ---------------------------------------------------------------------------

function formatNotificationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Pending Actions
// ---------------------------------------------------------------------------

function PendingActions({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Inbox className="h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold">Pending Actions</h2>
            <p className="text-[12px] text-[var(--muted-foreground)]">You're all caught up — no pending actions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Bell className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Pending Actions</h2>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {notifications.length} {notifications.length === 1 ? 'item needs' : 'items need'} your attention
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-[var(--border)]">
        {notifications.map((n) => (
          <li key={n.id} className="py-3 first:pt-0 last:pb-0">
            {n.link_url ? (
              <Link href={n.link_url} className="group flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium group-hover:text-[var(--primary)] transition-colors">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)] line-clamp-1">
                    {n.message}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                    {formatNotificationTime(n.created_at)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{n.title}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)] line-clamp-1">
                    {n.message}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--muted-foreground)] tabular-nums pt-0.5">
                  {formatNotificationTime(n.created_at)}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface TenantDashboardClientProps {
  applications: TenantApplicationWithDeal[];
  notifications?: Notification[];
}

export function TenantDashboardClient({
  applications,
  notifications = [],
}: TenantDashboardClientProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track your applications and deals
        </p>
      </div>

      {/* Pending Actions */}
      <div className="mt-6">
        <PendingActions notifications={notifications} />
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="mt-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            No applications found. Apply for a space to get started.
          </p>
          <Link
            href="/apply"
            className="mt-4 inline-flex items-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary-light)]"
          >
            Apply Now
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
