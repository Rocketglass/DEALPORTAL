'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  User,
  ShieldCheck,
  CreditCard,
  FileText,
  FileSpreadsheet,
  FileBadge,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatSqft } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type {
  Application,
  ApplicationDocument,
  CreditCheckStatus,
  ApplicationStatus,
  DocumentType,
} from '@/types/database';

// ============================================================
// Mock Data
// ============================================================

const mockApplication: Application = {
  id: 'app-001',
  property_id: 'prop-001',
  unit_id: 'unit-001',
  contact_id: 'contact-001',
  status: 'under_review',
  business_name: 'Pacific Coast Welding LLC',
  business_type: 'LLC',
  business_entity_state: 'CA',
  agreed_use: 'Metal fabrication and welding services',
  years_in_business: 8,
  number_of_employees: 12,
  annual_revenue: 1850000,
  requested_sf: 2721,
  desired_term_months: 36,
  desired_move_in: '2026-04-01',
  desired_rent_budget: 3500,
  guarantor_name: 'Maria Martinez',
  guarantor_phone: '(619) 555-0198',
  guarantor_email: 'maria@pcwelding.com',
  credit_check_status: 'not_run',
  credit_check_date: null,
  credit_score: null,
  credit_report_url: null,
  submitted_at: '2026-03-10T14:30:00Z',
  reviewed_at: null,
  reviewed_by: null,
  review_notes: null,
  portal_source: 'qr_code',
  qr_code_id: 'qr-001',
  created_at: '2026-03-09T10:00:00Z',
  updated_at: '2026-03-10T14:30:00Z',
};

const mockContact = {
  first_name: 'John',
  last_name: 'Martinez',
  email: 'john@pcwelding.com',
  phone: '(619) 555-0142',
};

const mockProperty = {
  name: 'Gillespie Business Park',
};

const mockUnit = {
  suite_number: '104',
};

const mockDocuments: ApplicationDocument[] = [
  {
    id: 'doc-001',
    application_id: 'app-001',
    document_type: 'tax_return',
    file_url: '#',
    file_name: '2025_Federal_Tax_Return.pdf',
    file_size_bytes: 2456000,
    mime_type: 'application/pdf',
    tax_year: 2025,
    period_start: null,
    period_end: null,
    uploaded_at: '2026-03-10T14:20:00Z',
    reviewed: true,
    reviewed_at: '2026-03-11T09:00:00Z',
    reviewed_by: 'broker-001',
    reviewer_notes: null,
  },
  {
    id: 'doc-002',
    application_id: 'app-001',
    document_type: 'tax_return',
    file_url: '#',
    file_name: '2024_Federal_Tax_Return.pdf',
    file_size_bytes: 2180000,
    mime_type: 'application/pdf',
    tax_year: 2024,
    period_start: null,
    period_end: null,
    uploaded_at: '2026-03-10T14:21:00Z',
    reviewed: true,
    reviewed_at: '2026-03-11T09:05:00Z',
    reviewed_by: 'broker-001',
    reviewer_notes: null,
  },
  {
    id: 'doc-003',
    application_id: 'app-001',
    document_type: 'tax_return',
    file_url: '#',
    file_name: '2023_Federal_Tax_Return.pdf',
    file_size_bytes: 1950000,
    mime_type: 'application/pdf',
    tax_year: 2023,
    period_start: null,
    period_end: null,
    uploaded_at: '2026-03-10T14:22:00Z',
    reviewed: false,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_notes: null,
  },
  {
    id: 'doc-004',
    application_id: 'app-001',
    document_type: 'bank_statement',
    file_url: '#',
    file_name: 'Chase_Statement_Feb2026.pdf',
    file_size_bytes: 845000,
    mime_type: 'application/pdf',
    tax_year: null,
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    uploaded_at: '2026-03-10T14:23:00Z',
    reviewed: false,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_notes: null,
  },
  {
    id: 'doc-005',
    application_id: 'app-001',
    document_type: 'bank_statement',
    file_url: '#',
    file_name: 'Chase_Statement_Jan2026.pdf',
    file_size_bytes: 790000,
    mime_type: 'application/pdf',
    tax_year: null,
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    uploaded_at: '2026-03-10T14:24:00Z',
    reviewed: false,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_notes: null,
  },
  {
    id: 'doc-006',
    application_id: 'app-001',
    document_type: 'business_license',
    file_url: '#',
    file_name: 'CA_Business_License_2026.pdf',
    file_size_bytes: 320000,
    mime_type: 'application/pdf',
    tax_year: null,
    period_start: null,
    period_end: null,
    uploaded_at: '2026-03-10T14:25:00Z',
    reviewed: false,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_notes: null,
  },
];

// ============================================================
// Helpers
// ============================================================

const creditStatusConfig: Record<CreditCheckStatus, { label: string; classes: string; icon: typeof Clock }> = {
  not_run: { label: 'Not Run', classes: 'text-gray-500', icon: Clock },
  pending: { label: 'Pending', classes: 'text-amber-600', icon: Clock },
  completed: { label: 'Completed', classes: 'text-green-600', icon: CheckCircle2 },
  failed: { label: 'Failed', classes: 'text-red-600', icon: XCircle },
};

const docTypeLabels: Record<DocumentType, string> = {
  tax_return: 'Tax Return',
  bank_statement: 'Bank Statement',
  pnl: 'P&L Statement',
  business_license: 'Business License',
  id: 'Identification',
  credit_report: 'Credit Report',
  other: 'Other',
};

const docTypeIcons: Record<DocumentType, typeof FileText> = {
  tax_return: FileSpreadsheet,
  bank_statement: FileText,
  pnl: FileSpreadsheet,
  business_license: FileBadge,
  id: ShieldCheck,
  credit_report: CreditCard,
  other: FileText,
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCreditScoreColor(score: number): string {
  if (score >= 750) return 'text-green-600';
  if (score >= 650) return 'text-amber-600';
  return 'text-red-600';
}

function getCreditScoreBg(score: number): string {
  if (score >= 750) return 'bg-green-50 border-green-200';
  if (score >= 650) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

// ============================================================
// Components
// ============================================================

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader icon={icon} borderBottom={false}>
        <CardTitle className="uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// ============================================================
// Page Component
// ============================================================

export default function ApplicationReviewPage() {
  const app = mockApplication;
  const contact = mockContact;
  const property = mockProperty;
  const unit = mockUnit;
  const documents = mockDocuments;

  const [creditStatus, setCreditStatus] = useState<CreditCheckStatus>(app.credit_check_status);
  const [creditScore, setCreditScore] = useState<number | null>(app.credit_score);
  const [reviewNotes, setReviewNotes] = useState(app.review_notes || '');
  const [docReviewState, setDocReviewState] = useState<Record<string, boolean>>(
    Object.fromEntries(documents.map((d) => [d.id, d.reviewed]))
  );
  const [viewingDoc, setViewingDoc] = useState<ApplicationDocument | null>(null);
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(app.status);

  const creditInfo = creditStatusConfig[creditStatus];
  const CreditIcon = creditInfo.icon;

  function handleRunCreditCheck() {
    setCreditStatus('pending');
    setTimeout(() => {
      setCreditStatus('completed');
      setCreditScore(782);
    }, 2000);
  }

  function toggleDocReview(docId: string) {
    setDocReviewState((prev) => ({ ...prev, [docId]: !prev[docId] }));
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Back navigation */}
      <BackButton href="/applications" label="Back to Applications" className="mb-6" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{app.business_name}</h1>
            <Badge status={appStatus} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {property.name} — Suite {unit.suite_number}
            <span className="mx-2">·</span>
            Submitted {formatDate(app.submitted_at!)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <SectionCard title="Business Information" icon={Building2}>
            <InfoRow label="Business Name" value={app.business_name} />
            <InfoRow
              label="Entity Type"
              value={
                app.business_type
                  ? `${app.business_type}${app.business_entity_state ? `, ${app.business_entity_state}` : ''}`
                  : null
              }
            />
            <InfoRow label="Agreed Use" value={app.agreed_use} />
            <InfoRow
              label="Years in Business"
              value={app.years_in_business != null ? `${app.years_in_business} years` : null}
            />
            <InfoRow
              label="Employees"
              value={app.number_of_employees != null ? app.number_of_employees.toString() : null}
            />
            <InfoRow
              label="Annual Revenue"
              value={app.annual_revenue != null ? formatCurrency(app.annual_revenue) : null}
            />
          </SectionCard>

          {/* Space Requirements */}
          <SectionCard title="Space Requirements" icon={Building2}>
            <InfoRow
              label="Requested Square Footage"
              value={app.requested_sf != null ? formatSqft(app.requested_sf) : null}
            />
            <InfoRow
              label="Desired Term"
              value={
                app.desired_term_months != null ? `${app.desired_term_months} months` : null
              }
            />
            <InfoRow
              label="Target Move-in Date"
              value={app.desired_move_in ? formatDate(app.desired_move_in) : null}
            />
            <InfoRow
              label="Rent Budget"
              value={
                app.desired_rent_budget != null
                  ? `${formatCurrency(app.desired_rent_budget)}/mo`
                  : null
              }
            />
          </SectionCard>

          {/* Contact Information */}
          <SectionCard title="Contact Information" icon={User}>
            <InfoRow
              label="Name"
              value={`${contact.first_name} ${contact.last_name}`}
            />
            <InfoRow
              label="Email"
              value={
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
              }
            />
            <InfoRow
              label="Phone"
              value={
                <a
                  href={`tel:${contact.phone}`}
                  className="text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              }
            />
          </SectionCard>

          {/* Guarantor Information */}
          <SectionCard title="Guarantor Information" icon={ShieldCheck}>
            {app.guarantor_name ? (
              <>
                <InfoRow label="Name" value={app.guarantor_name} />
                <InfoRow
                  label="Email"
                  value={
                    app.guarantor_email ? (
                      <a
                        href={`mailto:${app.guarantor_email}`}
                        className="text-primary hover:underline"
                      >
                        {app.guarantor_email}
                      </a>
                    ) : null
                  }
                />
                <InfoRow
                  label="Phone"
                  value={
                    app.guarantor_phone ? (
                      <a
                        href={`tel:${app.guarantor_phone}`}
                        className="text-primary hover:underline"
                      >
                        {app.guarantor_phone}
                      </a>
                    ) : null
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No guarantor provided
              </p>
            )}
          </SectionCard>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setAppStatus('approved')}
                  disabled={appStatus === 'approved'}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'approved'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {appStatus === 'approved' ? 'Approved' : 'Approve Application'}
                  </span>
                </button>
                <button
                  onClick={() => setAppStatus('rejected')}
                  disabled={appStatus === 'rejected'}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'rejected'
                      ? 'bg-red-100 text-red-700 cursor-default'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {appStatus === 'rejected' ? 'Rejected' : 'Reject Application'}
                  </span>
                </button>
                <button
                  onClick={() => setAppStatus('info_requested')}
                  disabled={appStatus === 'info_requested'}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'info_requested'
                      ? 'bg-amber-100 text-amber-700 cursor-default'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {appStatus === 'info_requested' ? 'Info Requested' : 'Request More Info'}
                  </span>
                </button>
                <div className="border-t border-border/50 pt-3">
                  <Button
                    variant="secondary"
                    size="md"
                    icon={CreditCard}
                    onClick={handleRunCreditCheck}
                    disabled={creditStatus === 'pending' || creditStatus === 'completed'}
                    loading={creditStatus === 'pending'}
                    className="w-full"
                  >
                    {creditStatus === 'pending'
                      ? 'Running Credit Check...'
                      : creditStatus === 'completed'
                        ? 'Credit Check Complete'
                        : 'Run Credit Check'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Check */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Credit Check
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <CreditIcon className={cn('h-4 w-4', creditInfo.classes)} />
                <span className={cn('text-sm font-medium', creditInfo.classes)}>
                  {creditInfo.label}
                </span>
              </div>
              {creditStatus === 'completed' && creditScore !== null && (
                <div
                  className={cn(
                    'rounded-lg border p-4 text-center',
                    getCreditScoreBg(creditScore)
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Credit Score
                  </p>
                  <p className={cn('text-4xl font-bold', getCreditScoreColor(creditScore))}>
                    {creditScore}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {creditScore >= 750
                      ? 'Excellent'
                      : creditScore >= 650
                        ? 'Good'
                        : 'Below Average'}
                  </p>
                </div>
              )}
              {creditStatus === 'pending' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                  <div className="animate-pulse">
                    <div className="h-8 w-16 bg-amber-200 rounded mx-auto mb-2" />
                    <p className="text-xs text-amber-600">Processing...</p>
                  </div>
                </div>
              )}
              {creditStatus === 'not_run' && (
                <p className="text-sm text-muted-foreground">
                  Run a credit check to see the applicant's score.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Review Notes */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Review Notes
              </h3>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this application..."
                aria-label="Review notes"
                rows={5}
              />
              <Button variant="primary" className="mt-3 w-full">
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documents Section — full width */}
      <div className="mt-8">
        <Card>
          <CardHeader icon={FileText}>
            <CardTitle className="uppercase tracking-wide text-muted-foreground flex-1">
              Documents
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {Object.values(docReviewState).filter(Boolean).length} of {documents.length} reviewed
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const DocIcon = docTypeIcons[doc.document_type];
                const isReviewed = docReviewState[doc.id];

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'rounded-lg border p-4 transition-colors',
                      isReviewed ? 'border-green-200 bg-green-50/50' : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'rounded-lg p-2',
                          isReviewed ? 'bg-green-100' : 'bg-muted'
                        )}
                      >
                        <DocIcon
                          className={cn(
                            'h-5 w-5',
                            isReviewed ? 'text-green-600' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {docTypeLabels[doc.document_type]}
                          {doc.tax_year && ` · ${doc.tax_year}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size_bytes)} · {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        onClick={() => setViewingDoc(doc)}
                        className="flex-1"
                      >
                        View
                      </Button>
                      <button
                        onClick={() => toggleDocReview(doc.id)}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          isReviewed
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'border border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label={`Document viewer: ${viewingDoc.file_name}`} aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setViewingDoc(null)}
          />
          <div className="relative w-full max-w-3xl mx-4 rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold">{viewingDoc.file_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {docTypeLabels[viewingDoc.document_type]}
                  {viewingDoc.tax_year && ` · ${viewingDoc.tax_year}`}
                  {' · '}
                  {formatFileSize(viewingDoc.file_size_bytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={Download}>
                  Download
                </Button>
                <button
                  onClick={() => setViewingDoc(null)}
                  aria-label="Close document viewer"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center h-96 bg-muted/30 rounded-b-xl">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Document preview will be available when connected to storage.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
