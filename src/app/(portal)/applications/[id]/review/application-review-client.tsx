'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  User,
  ShieldCheck,
  CreditCard,
  FileText,
  FileSpreadsheet,
  FileBadge,
  FileSignature,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  X,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatSqft } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PdfViewer } from '@/components/ui/pdf-viewer';
import type {
  ApplicationDocument,
  CreditCheckStatus,
  ApplicationStatus,
  DocumentType,
  ApplicationWithRelations,
} from '@/types/database';

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
  if (!bytes) return '--';
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
// Sub-components
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
// Credit Check Dropdown
// ============================================================

function CreditCheckDropdown({
  applicationId,
  onComplete: _onComplete,
  disabled,
}: {
  applicationId: string;
  onComplete: (score: number, date: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'upload' | 'manual' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setMode(null);
        setError(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      // Upload the credit report document
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'credit_report');

      const uploadRes = await fetch(
        `/api/applications/${applicationId}/documents`,
        { method: 'POST', body: formData }
      );

      if (!uploadRes.ok) {
        const json = await uploadRes.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to upload credit report');
      }

      const uploadData = await uploadRes.json();

      // Now prompt for the score — switch to manual mode with the report URL
      setMode('manual');
      setError(null);

      // Store the report URL for when the user submits the score
      (dropdownRef.current as HTMLDivElement & { _reportUrl?: string })._reportUrl =
        uploadData.fileUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="secondary"
        size="md"
        icon={CreditCard}
        iconPosition="left"
        onClick={() => {
          setIsOpen(!isOpen);
          setMode(null);
          setError(null);
        }}
        disabled={disabled}
        className="w-full"
      >
        Run Credit Check
        <ChevronDown className="h-3.5 w-3.5 ml-auto" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-[#e2e8f0] bg-white shadow-lg z-20">
          {/* Error display */}
          {error && (
            <div className="mx-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Upload credit report — no manual entry */}
          {(!mode || mode === 'menu') && (
            <div className="p-2">
              <button
                onClick={() => {
                  setMode('upload');
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                disabled={uploading}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left hover:bg-[#f1f5f9] transition-colors"
              >
                <Upload className="h-4 w-4 text-[#64748b]" />
                <div>
                  <p className="font-medium text-[#0f172a]">Upload Credit Report</p>
                  <p className="text-xs text-[#64748b]">Upload a PDF credit report</p>
                </div>
              </button>
            </div>
          )}

          {/* Upload mode — hidden file input */}
          {mode === 'upload' && (
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1e40af] border-t-transparent" />
                  <span className="text-sm text-[#64748b]">Uploading...</span>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-[#64748b]">Select a PDF file to upload</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual mode removed — credit reports must be uploaded */}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Client Component
// ============================================================

interface Props {
  application: ApplicationWithRelations;
}

export function ApplicationReviewClient({ application }: Props) {
  const app = application;
  const contact = application.contact;
  const property = application.property;
  const unit = application.unit;
  const documents = application.documents;

  const router = useRouter();

  const [creditStatus, setCreditStatus] = useState<CreditCheckStatus>(app.credit_check_status);
  const [creditScore, setCreditScore] = useState<number | null>(app.credit_score);
  const [creditCheckDate, setCreditCheckDate] = useState<string | null>(app.credit_check_date);
  const [reviewNotes, setReviewNotes] = useState(app.review_notes || '');
  const [docReviewState, setDocReviewState] = useState<Record<string, boolean>>(
    Object.fromEntries(documents.map((d) => [d.id, d.reviewed]))
  );
  const [viewingDoc, setViewingDoc] = useState<ApplicationDocument | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [docUrlLoading, setDocUrlLoading] = useState(false);
  const [expandedDocGroups, setExpandedDocGroups] = useState<Record<string, boolean>>({});
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(app.status);
  const [statusLoading, setStatusLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showInfoRequestModal, setShowInfoRequestModal] = useState(false);
  const [infoRequestMessage, setInfoRequestMessage] = useState('');

  const creditInfo = creditStatusConfig[creditStatus];
  const CreditIcon = creditInfo.icon;

  async function handleStatusChange(newStatus: ApplicationStatus, message?: string) {
    if (newStatus === appStatus) return;
    setStatusLoading(true);
    setActionError(null);
    try {
      const payload: { status: string; review_notes?: string } = { status: newStatus };
      if (message?.trim()) {
        payload.review_notes = message.trim();
      }
      const res = await fetch(`/api/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error ?? 'Failed to update status');
        return;
      }
      setAppStatus(newStatus);
      router.refresh();
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleSaveNotes() {
    setNotesLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: appStatus, review_notes: reviewNotes }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error ?? 'Failed to save notes');
      } else {
        router.refresh();
      }
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setNotesLoading(false);
    }
  }

  function handleCreditCheckComplete(score: number, date: string) {
    setCreditStatus('completed');
    setCreditScore(score);
    setCreditCheckDate(date);
    router.refresh();
  }

  function toggleDocReview(docId: string) {
    setDocReviewState((prev) => ({ ...prev, [docId]: !prev[docId] }));
  }

  async function handleViewDocument(doc: ApplicationDocument) {
    setViewingDoc(doc);
    setViewingDocUrl(null);
    setDocUrlLoading(true);
    try {
      const res = await fetch(
        `/api/applications/${app.id}/documents/${doc.id}/view`
      );
      if (res.ok) {
        const json = await res.json();
        setViewingDocUrl(json.url);
      } else {
        // Fallback: use the public file_url directly
        setViewingDocUrl(doc.file_url);
      }
    } catch {
      // Fallback to public URL on network error
      setViewingDocUrl(doc.file_url);
    } finally {
      setDocUrlLoading(false);
    }
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
            {property?.name ?? 'General Application'}
            {unit?.suite_number && ` — Suite ${unit.suite_number}`}
            <span className="mx-2">·</span>
            Submitted {formatDate(app.submitted_at ?? app.created_at)}
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
              value={`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()}
            />
            <InfoRow
              label="Email"
              value={
                contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : null
              }
            />
            <InfoRow
              label="Phone"
              value={
                contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-primary hover:underline"
                  >
                    {contact.phone}
                  </a>
                ) : null
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
              {actionError && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={appStatus === 'approved' || statusLoading}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'approved'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-60'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {appStatus === 'approved' ? 'Approved' : 'Approve Application'}
                  </span>
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={appStatus === 'rejected' || statusLoading}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'rejected'
                      ? 'bg-red-100 text-red-700 cursor-default'
                      : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {appStatus === 'rejected' ? 'Rejected' : 'Reject Application'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (appStatus === 'info_requested') return;
                    setInfoRequestMessage('');
                    setShowInfoRequestModal(true);
                  }}
                  disabled={appStatus === 'info_requested' || statusLoading}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    appStatus === 'info_requested'
                      ? 'bg-amber-100 text-amber-700 cursor-default'
                      : 'bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {appStatus === 'info_requested' ? 'Info Requested' : 'Request More Info'}
                  </span>
                </button>
                {appStatus === 'approved' && (
                  <Link
                    href={`/lois/new?application=${app.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e40af]/90"
                  >
                    <FileSignature className="h-4 w-4" />
                    Draft LOI
                  </Link>
                )}
                <div className="border-t border-border/50 pt-3">
                  {creditStatus === 'completed' ? (
                    <Button
                      variant="secondary"
                      size="md"
                      icon={CreditCard}
                      disabled
                      className="w-full"
                    >
                      Credit Check Complete
                    </Button>
                  ) : creditStatus === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="md"
                      icon={CreditCard}
                      loading
                      disabled
                      className="w-full"
                    >
                      Running Credit Check...
                    </Button>
                  ) : (
                    <CreditCheckDropdown
                      applicationId={app.id}
                      onComplete={handleCreditCheckComplete}
                      disabled={false}
                    />
                  )}
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
                  {creditCheckDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Checked {formatDate(creditCheckDate)}
                    </p>
                  )}
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
                  Run a credit check to see the applicant&apos;s score.
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
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={handleSaveNotes}
                loading={notesLoading}
                disabled={notesLoading}
              >
                {notesLoading ? 'Saving…' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documents Section — full width, grouped by type with version control */}
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
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Group documents by type, sorted by uploaded_at desc within each group
                  const grouped: Record<string, ApplicationDocument[]> = {};
                  for (const doc of documents) {
                    const key = doc.document_type;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(doc);
                  }
                  // Sort each group by uploaded_at descending (latest first)
                  for (const key of Object.keys(grouped)) {
                    grouped[key].sort(
                      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
                    );
                  }

                  return Object.entries(grouped).map(([docType, docs]) => {
                    const latestDoc = docs[0];
                    const olderDocs = docs.slice(1);
                    const DocIcon = docTypeIcons[docType as DocumentType];
                    const isLatestReviewed = docReviewState[latestDoc.id];
                    const hasOlderVersions = olderDocs.length > 0;
                    const showOlder = expandedDocGroups[docType] ?? false;

                    return (
                      <div key={docType}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                          {docTypeLabels[docType as DocumentType]}
                          {docs.length > 1 && (
                            <span className="ml-2 text-[10px] font-normal normal-case">
                              ({docs.length} version{docs.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </h4>

                        {/* Latest version (prominent) */}
                        <div
                          className={cn(
                            'rounded-lg border p-4 transition-colors',
                            isLatestReviewed ? 'border-green-200 bg-green-50/50' : 'border-border'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'rounded-lg p-2',
                                isLatestReviewed ? 'bg-green-100' : 'bg-muted'
                              )}
                            >
                              <DocIcon
                                className={cn(
                                  'h-5 w-5',
                                  isLatestReviewed ? 'text-green-600' : 'text-muted-foreground'
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{latestDoc.file_name}</p>
                                {docs.length > 1 && (
                                  <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {docTypeLabels[latestDoc.document_type]}
                                {latestDoc.tax_year && ` · ${latestDoc.tax_year}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(latestDoc.file_size_bytes)} · {formatDate(latestDoc.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleViewDocument(latestDoc)}
                              className="flex-1"
                            >
                              View
                            </Button>
                            <button
                              onClick={() => toggleDocReview(latestDoc.id)}
                              className={cn(
                                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                isLatestReviewed
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'border border-border text-muted-foreground hover:bg-muted'
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {isLatestReviewed ? 'Reviewed' : 'Mark Reviewed'}
                            </button>
                          </div>
                        </div>

                        {/* Older versions (collapsible) */}
                        {hasOlderVersions && (
                          <div className="mt-2">
                            <button
                              onClick={() =>
                                setExpandedDocGroups((prev) => ({
                                  ...prev,
                                  [docType]: !prev[docType],
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 transition-transform',
                                  showOlder && 'rotate-180'
                                )}
                              />
                              {showOlder ? 'Hide' : 'Show'} {olderDocs.length} previous version{olderDocs.length > 1 ? 's' : ''}
                            </button>

                            {showOlder && (
                              <div className="mt-2 space-y-2">
                                {olderDocs.map((doc, versionIdx) => {
                                  const OlderDocIcon = docTypeIcons[doc.document_type];
                                  const isOlderReviewed = docReviewState[doc.id];
                                  const versionNumber = docs.length - 1 - versionIdx;

                                  return (
                                    <div
                                      key={doc.id}
                                      className={cn(
                                        'rounded-lg border p-3 transition-colors opacity-75',
                                        isOlderReviewed ? 'border-green-200 bg-green-50/30' : 'border-border/60'
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <OlderDocIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-medium truncate">{doc.file_name}</p>
                                            <span className="text-[10px] text-muted-foreground">
                                              v{versionNumber}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">
                                            {formatFileSize(doc.file_size_bytes)} · {formatDate(doc.uploaded_at)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            onClick={() => handleViewDocument(doc)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                                          >
                                            <Eye className="h-3 w-3" /> View
                                          </button>
                                          <button
                                            onClick={() => toggleDocReview(doc.id)}
                                            className={cn(
                                              'inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                                              isOlderReviewed
                                                ? 'bg-green-100 text-green-700'
                                                : 'border border-border text-muted-foreground hover:bg-muted'
                                            )}
                                          >
                                            <CheckCircle2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PDF Viewer Modal */}
      {viewingDoc && viewingDocUrl && !docUrlLoading && (
        <PdfViewer
          url={viewingDocUrl}
          fileName={viewingDoc.file_name}
          onClose={() => {
            setViewingDoc(null);
            setViewingDocUrl(null);
          }}
        />
      )}

      {/* Loading state for document URL fetch */}
      {viewingDoc && docUrlLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Loading document" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => {
              setViewingDoc(null);
              setDocUrlLoading(false);
            }}
          />
          <div className="relative rounded-xl bg-white p-8 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1e40af] border-t-transparent" />
              <span className="text-sm text-[#64748b]">Loading document...</span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback: doc URL failed but viewingDoc is set */}
      {viewingDoc && !viewingDocUrl && !docUrlLoading && (
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

      {/* Request More Info Modal */}
      {showInfoRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Request more information" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setShowInfoRequestModal(false)}
          />
          <div className="relative w-full max-w-lg mx-4 rounded-xl bg-white shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold">Request More Information</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Describe what additional information or documents you need from the applicant. They will be notified via email.
              </p>
            </div>
            <div className="px-5 py-4">
              <textarea
                rows={4}
                value={infoRequestMessage}
                onChange={(e) => setInfoRequestMessage(e.target.value)}
                placeholder="e.g. Please provide your most recent 2 years of tax returns and a current bank statement..."
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <button
                onClick={() => setShowInfoRequestModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!infoRequestMessage.trim()) return;
                  setShowInfoRequestModal(false);
                  await handleStatusChange('info_requested', infoRequestMessage);
                  setReviewNotes(infoRequestMessage.trim());
                }}
                disabled={!infoRequestMessage.trim() || statusLoading}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
