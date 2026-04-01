'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  FileText,
  FileSpreadsheet,
  FileBadge,
  ShieldCheck,
  CreditCard,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Loader2,
  Check,
  XCircle,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PdfViewer } from '@/components/ui/pdf-viewer';
import { formatDate, formatCurrency } from '@/lib/utils';
import type {
  ApplicationWithRelations,
  ApplicationDocument,
  ApplicationStatus,
  DocumentType,
} from '@/types/database';

// ============================================================
// Helpers
// ============================================================

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-right">{value ?? '\u2014'}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border-subtle">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Progress Stepper
// ============================================================

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

// ============================================================
// Document row with signed URL viewer
// ============================================================

function DocumentRow({
  doc,
  applicationId,
}: {
  doc: ApplicationDocument;
  applicationId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const DocIcon = docTypeIcons[doc.document_type] ?? FileText;

  async function handleView() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/documents/${doc.id}/view`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to get document URL');
      }
      const { url } = await res.json();
      setPdfUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {pdfUrl && (
        <PdfViewer
          url={pdfUrl}
          fileName={doc.file_name}
          onClose={() => setPdfUrl(null)}
        />
      )}

      <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <DocIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-foreground">
                {docTypeLabels[doc.document_type] ?? doc.document_type}
              </span>
              {doc.reviewed ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Reviewed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Pending review
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{doc.file_name}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>{formatFileSize(doc.file_size_bytes)}</span>
              {doc.uploaded_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(doc.uploaded_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {error && (
            <p className="mb-1 text-[11px] text-destructive text-right">{error}</p>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            iconPosition="left"
            onClick={handleView}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'View'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Info Requested section with file upload
// ============================================================

function InfoRequestedSection({
  applicationId,
  reviewNotes,
}: {
  applicationId: string;
  reviewNotes: string | null;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setUploaded(false);
      setUploadError(null);
    }
  }, []);

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'other');
        const res = await fetch(`/api/applications/${applicationId}/documents`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `Failed to upload ${file.name}`);
        }
      }
      setUploaded(true);
      setFiles([]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800">
            Additional information requested
          </p>
          {reviewNotes ? (
            <p className="mt-1 text-sm text-orange-700">
              &ldquo;{reviewNotes}&rdquo;
            </p>
          ) : (
            <p className="mt-1 text-sm text-orange-700">
              Your broker needs more information to proceed.
            </p>
          )}

          {/* Upload section */}
          <div className="mt-4 space-y-3">
            {uploaded ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Documents uploaded successfully. Your broker has been notified.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    Choose Files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {files.length > 0 && (
                    <span className="text-sm text-orange-700">
                      {files.length} file{files.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {files.length > 0 && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-60"
                  >
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Send Additional Info</>
                    )}
                  </button>
                )}
              </>
            )}
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

interface Props {
  application: ApplicationWithRelations;
}

export function ApplicationDetailClient({ application }: Props) {
  const contact = application.contact;
  const property = application.property;
  const unit = application.unit;
  const documents = application.documents ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Back button + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/tenant/applications"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">
              {application.business_name}
            </h1>
            <Badge status={application.status} />
          </div>
          {application.submitted_at && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Submitted {formatDate(application.submitted_at)}
            </p>
          )}
        </div>
      </div>

      {/* Progress stepper */}
      <div className="mt-6 flex justify-center">
        <ProgressStepper status={application.status} />
      </div>

      {/* Info requested banner */}
      {application.status === 'info_requested' && (
        <div className="mt-6">
          <InfoRequestedSection
            applicationId={application.id}
            reviewNotes={application.review_notes}
          />
        </div>
      )}

      {/* Content grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Business Information */}
        <SectionCard title="Business Information" icon={Building2}>
          <InfoRow label="Business Name" value={application.business_name} />
          <InfoRow label="Business Type" value={application.business_type} />
          <InfoRow label="Entity State" value={application.business_entity_state} />
          <InfoRow label="Agreed Use" value={application.agreed_use} />
          <InfoRow
            label="Years in Business"
            value={
              application.years_in_business != null
                ? `${application.years_in_business} years`
                : null
            }
          />
          <InfoRow
            label="Employees"
            value={
              application.number_of_employees != null
                ? application.number_of_employees.toString()
                : null
            }
          />
          <InfoRow
            label="Annual Revenue"
            value={
              application.annual_revenue != null
                ? formatCurrency(application.annual_revenue)
                : null
            }
          />
        </SectionCard>

        {/* Space Requirements */}
        <SectionCard title="Space Requirements" icon={MapPin}>
          <InfoRow label="Property" value={property?.name} />
          {property && (
            <InfoRow
              label="Address"
              value={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
            />
          )}
          <InfoRow
            label="Unit"
            value={unit ? `Suite ${unit.suite_number}` : null}
          />
          <InfoRow
            label="Requested SF"
            value={
              application.requested_sf != null
                ? `${application.requested_sf.toLocaleString()} SF`
                : null
            }
          />
          <InfoRow
            label="Desired Term"
            value={
              application.desired_term_months != null
                ? `${application.desired_term_months} months`
                : null
            }
          />
          <InfoRow
            label="Desired Move-in"
            value={
              application.desired_move_in
                ? formatDate(application.desired_move_in)
                : null
            }
          />
          <InfoRow
            label="Budget"
            value={
              application.desired_rent_budget != null
                ? formatCurrency(application.desired_rent_budget)
                : null
            }
          />
        </SectionCard>

        {/* Contact Information */}
        <SectionCard title="Contact Information" icon={User}>
          <InfoRow
            label="Name"
            value={
              contact
                ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || null
                : null
            }
          />
          <InfoRow label="Email" value={contact?.email} />
          <InfoRow label="Phone" value={contact?.phone} />
          <InfoRow label="Company" value={contact?.company_name} />
          <InfoRow label="Entity Type" value={contact?.entity_type} />
          <InfoRow label="Industry" value={contact?.industry} />
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Documents" icon={FileText}>
          {documents.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-2">
              No documents uploaded yet.
            </p>
          ) : (
            <div>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  applicationId={application.id}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
