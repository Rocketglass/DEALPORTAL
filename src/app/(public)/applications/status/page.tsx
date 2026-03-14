'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Phone,
  Mail,
  Check,
} from 'lucide-react';
import type { ApplicationStatus, DocumentType } from '@/types/database';

type StatusStep = {
  key: ApplicationStatus;
  label: string;
};

const statusSteps: StatusStep[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Decision' },
];

interface MockDocument {
  id: string;
  name: string;
  type: DocumentType;
  reviewed: boolean;
  uploadedAt: string;
}

interface MockApplication {
  id: string;
  businessName: string;
  propertyName: string;
  suiteName: string;
  submittedAt: string;
  status: ApplicationStatus;
  brokerNotes: string | null;
  documents: MockDocument[];
}

const mockApplication: MockApplication = {
  id: 'app-001',
  businessName: 'Pacific Coast Welding LLC',
  propertyName: '1250 Pioneer Way',
  suiteName: 'Suite B',
  submittedAt: '2026-03-10T14:30:00Z',
  status: 'under_review',
  brokerNotes: null,
  documents: [
    {
      id: 'doc-001',
      name: '2025_Tax_Return.pdf',
      type: 'tax_return',
      reviewed: true,
      uploadedAt: '2026-03-10T14:28:00Z',
    },
    {
      id: 'doc-002',
      name: '2024_Tax_Return.pdf',
      type: 'tax_return',
      reviewed: true,
      uploadedAt: '2026-03-10T14:28:00Z',
    },
    {
      id: 'doc-003',
      name: 'Bank_Statement_Jan2026.pdf',
      type: 'bank_statement',
      reviewed: false,
      uploadedAt: '2026-03-10T14:29:00Z',
    },
    {
      id: 'doc-004',
      name: 'Business_License.pdf',
      type: 'business_license',
      reviewed: true,
      uploadedAt: '2026-03-10T14:29:00Z',
    },
    {
      id: 'doc-005',
      name: 'PnL_2025.pdf',
      type: 'pnl',
      reviewed: false,
      uploadedAt: '2026-03-10T14:30:00Z',
    },
  ],
};

function getStepIndex(status: ApplicationStatus): number {
  if (status === 'submitted') return 0;
  if (status === 'under_review' || status === 'info_requested') return 1;
  if (status === 'approved' || status === 'rejected') return 2;
  return 0;
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    submitted: {
      label: 'Submitted',
      className: 'bg-blue-50 text-blue-700',
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    under_review: {
      label: 'Under Review',
      className: 'bg-amber-50 text-amber-700',
      icon: <Search className="h-3.5 w-3.5" />,
    },
    info_requested: {
      label: 'Info Requested',
      className: 'bg-orange-50 text-orange-700',
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-50 text-green-700',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700',
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };

  const c = config[status] ?? config.submitted;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
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
                  isCompleted || isCurrent ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {isLast && isRejected ? 'Rejected' : isLast && status === 'approved' ? 'Approved' : step.label}
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

function documentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    tax_return: 'Tax Return',
    bank_statement: 'Bank Statement',
    pnl: 'P&L Statement',
    business_license: 'Business License',
    id: 'ID Document',
    credit_report: 'Credit Report',
    other: 'Other',
  };
  return labels[type] ?? type;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [application, setApplication] = useState<MockApplication | null>(null);
  const [searched, setSearched] = useState(false);

  function handleCheckStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    // Mock delay
    setTimeout(() => {
      setApplication(mockApplication);
      setSearched(true);
      setIsLoading(false);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[var(--primary)]" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-light)]"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Track Your Application</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Enter the email address you used when applying to check the status of your application.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleCheckStatus} className="mt-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Check Status
            </button>
          </div>
        </form>

        {/* Results */}
        {searched && application && (
          <div className="mt-8 space-y-6">
            {/* Application card */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{application.businessName}</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {application.propertyName} &middot; {application.suiteName}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    Submitted {formatDate(application.submittedAt)}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>

              {/* Progress stepper */}
              <div className="mt-8 flex justify-center">
                <ProgressStepper status={application.status} />
              </div>

              {/* Info Requested banner */}
              {application.status === 'info_requested' && (
                <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Additional information requested
                      </p>
                      {application.brokerNotes && (
                        <p className="mt-1 text-sm text-orange-700">{application.brokerNotes}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Approved banner */}
              {application.status === 'approved' && (
                <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
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

              {/* Rejected banner */}
              {application.status === 'rejected' && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Application not approved
                      </p>
                      {application.brokerNotes && (
                        <p className="mt-1 text-sm text-red-700">{application.brokerNotes}</p>
                      )}
                      <p className="mt-1 text-sm text-red-700">
                        If you have questions, please contact your broker for more information.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Documents section */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Submitted Documents
              </h3>
              <div className="mt-4 divide-y divide-[var(--border)]">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {documentTypeLabel(doc.type)} &middot; Uploaded {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    {doc.reviewed ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-[var(--success)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reviewed
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">Pending review</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact section */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Questions?
              </h3>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                Contact Rocket Realty for any questions about your application.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span>(619) 555-0100</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <a href="mailto:leasing@rocketrealty.com" className="text-[var(--primary)] hover:underline">
                    leasing@rocketrealty.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {searched && !application && (
          <div className="mt-12 text-center">
            <Search className="mx-auto h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              No application found for this email address. Please check the email and try again.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
