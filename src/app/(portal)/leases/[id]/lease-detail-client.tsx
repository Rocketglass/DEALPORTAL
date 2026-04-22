'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Send,
  Download,
  Printer,
  Share2,
  Building2,
  Users,
  MapPin,
  Car,
  CalendarDays,
  DollarSign,
  ShieldCheck,
  Briefcase,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  X,
  Save,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatSqft } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { CollaboratorsPanel } from '@/components/deals/collaborators-panel';
import { CommentsPanel } from '@/components/deals/comments-panel';
import type { LeaseWithRelations, RentEscalation } from '@/types/database';

// ============================================================
// Helpers
// ============================================================

const signerStatusConfig: Record<string, { icon: typeof CheckCircle2; classes: string }> = {
  completed: { icon: CheckCircle2, classes: 'text-green-600' },
  sent: { icon: Clock, classes: 'text-amber-500' },
  declined: { icon: XCircle, classes: 'text-red-600' },
};

// ============================================================
// Components
// ============================================================

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2.5 border-b border-border/50 last:border-0 gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:text-right max-w-md">{value || '—'}</span>
    </div>
  );
}

let collapsibleCounter = 0;

function CollapsibleSection({
  number,
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  number: string;
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [sectionId] = useState(() => `collapsible-${++collapsibleCounter}`);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
          <div>
            <span className="text-xs text-muted-foreground font-medium">{number}</span>
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {isOpen && (
        <div id={sectionId} className="px-5 pb-5 border-t border-border/50">
          {children}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// Edit mode types
// ============================================================

interface EditableFields {
  base_rent_monthly: string;
  commencement_date: string;
  expiration_date: string;
  term_years: string;
  term_months: string;
  security_deposit: string;
  cam_percent: string;
  parking_spaces: string;
  agreed_use: string;
}

function initEditableFields(lease: LeaseWithRelations): EditableFields {
  return {
    base_rent_monthly: lease.base_rent_monthly?.toString() ?? '',
    commencement_date: lease.commencement_date ?? '',
    expiration_date: lease.expiration_date ?? '',
    term_years: lease.term_years?.toString() ?? '',
    term_months: lease.term_months?.toString() ?? '',
    security_deposit: lease.security_deposit?.toString() ?? '',
    cam_percent: lease.cam_percent?.toString() ?? '',
    parking_spaces: lease.parking_spaces?.toString() ?? '',
    agreed_use: lease.agreed_use ?? '',
  };
}

function EditableInfoRow({
  label,
  value,
  field,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  field: string;
  type?: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2.5 border-b border-border/50 last:border-0 gap-1 sm:items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="sm:max-w-xs"
      />
    </div>
  );
}

// ============================================================
// Props
// ============================================================

interface LeaseDetailClientProps {
  lease: LeaseWithRelations;
  escalations: RentEscalation[];
}

// ============================================================
// Page Component
// ============================================================

export default function LeaseDetailClient({ lease, escalations }: LeaseDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const property = lease.property;
  const unit = lease.unit;

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Share deal summary state
  const [copied, setCopied] = useState(false);

  async function handleShareDeal() {
    const url = `${window.location.origin}/deal/${lease.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied to clipboard', variant: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy link', variant: 'error' });
    }
  }

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState<EditableFields>(() => initEditableFields(lease));

  function handleFieldChange(field: string, value: string) {
    setEditFields((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancelEdit() {
    setEditFields(initEditableFields(lease));
    setIsEditing(false);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      // Only send fields that actually changed
      const rentMonthly = parseFloat(editFields.base_rent_monthly);
      if (!isNaN(rentMonthly) && rentMonthly !== lease.base_rent_monthly) {
        payload.base_rent_monthly = rentMonthly;
      }
      if (editFields.commencement_date && editFields.commencement_date !== lease.commencement_date) {
        payload.commencement_date = editFields.commencement_date;
      }
      if (editFields.expiration_date && editFields.expiration_date !== lease.expiration_date) {
        payload.expiration_date = editFields.expiration_date;
      }
      const termYears = editFields.term_years ? parseInt(editFields.term_years) : null;
      if (termYears !== lease.term_years) {
        payload.term_years = termYears;
      }
      const termMonths = editFields.term_months ? parseInt(editFields.term_months) : null;
      if (termMonths !== lease.term_months) {
        payload.term_months = termMonths;
      }
      const deposit = editFields.security_deposit ? parseFloat(editFields.security_deposit) : null;
      if (deposit !== lease.security_deposit) {
        payload.security_deposit = deposit;
      }
      const camPct = editFields.cam_percent ? parseFloat(editFields.cam_percent) : null;
      if (camPct !== lease.cam_percent) {
        payload.cam_percent = camPct;
      }
      const parkingSpaces = editFields.parking_spaces ? parseInt(editFields.parking_spaces) : null;
      if (parkingSpaces !== lease.parking_spaces) {
        payload.parking_spaces = parkingSpaces;
      }
      if ((editFields.agreed_use || null) !== (lease.agreed_use || null)) {
        payload.agreed_use = editFields.agreed_use || null;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/leases/${lease.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'Failed to save', description: json.error ?? 'Please try again', variant: 'error' });
        return;
      }

      toast({ title: 'Lease updated', variant: 'success' });
      setIsEditing(false);
      router.refresh();
    } catch {
      toast({ title: 'Network error', description: 'Please try again', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadPdf() {
    window.open(`/api/leases/${lease.id}/pdf`, '_blank');
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/generate-pdf`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'PDF generation failed', description: json.error ?? 'Please try again', variant: 'error' });
        return;
      }
      // Open the PDF blob in a new tab
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast({ title: 'Lease PDF generated', variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: 'Network error', description: 'Could not generate PDF', variant: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file twice still fires onChange.
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: 'Must be a PDF', variant: 'error' });
      return;
    }

    setUploadingPdf(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/leases/${lease.id}/upload-pdf`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'Upload failed', description: json.error ?? 'Please try again', variant: 'error' });
        return;
      }
      toast({ title: 'Lease PDF uploaded', description: 'Ready to send for signature.', variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: 'Network error', description: 'Could not upload PDF', variant: 'error' });
    } finally {
      setUploadingPdf(false);
    }
  }

  // DocuSign signer list derived from lease status
  const signers: Array<{ name: string; role: string; status: string; signedAt: string | null }> =
    lease.docusign_envelope_id
      ? [
          {
            name: lease.lessor_name,
            role: 'Lessor',
            status: lease.docusign_status === 'completed' ? 'completed' : 'sent',
            signedAt: lease.signed_date ?? null,
          },
          {
            name: lease.lessee_name,
            role: 'Lessee',
            status: 'sent',
            signedAt: null,
          },
          ...(lease.guarantor_names
            ? [{ name: lease.guarantor_names, role: 'Guarantor', status: 'sent', signedAt: null }]
            : []),
        ]
      : [];

  async function handleSendForSignature() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/leases/${lease.id}/send-for-signing`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSendError(json.error ?? 'Failed to send for signature');
        return;
      }
      router.refresh();
    } catch {
      setSendError('Network error — please try again');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back navigation */}
      <BackButton href="/leases" label="Back to Leases" className="mb-6" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">
              {property?.name ?? lease.premises_address ?? 'Lease'}
              {unit?.suite_number ? ` — Suite ${unit.suite_number}` : ''}
            </h1>
            <Badge status={lease.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {lease.lessee_name}
            <span className="mx-2">·</span>
            {lease.lessor_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            AIR {lease.form_type}
            {lease.form_version && ` · ${lease.form_version}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button variant="secondary" icon={X} onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={Save}
                  onClick={handleSaveEdit}
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  icon={Printer}
                  onClick={() => window.open(`/leases/${lease.id}/print`, '_blank')}
                >
                  Preview
                </Button>
                {['draft', 'review'].includes(lease.status) && (
                  <Button
                    variant="secondary"
                    icon={FileText}
                    onClick={handleGeneratePdf}
                    loading={generatingPdf}
                    disabled={generatingPdf}
                    title="Generate a summary PDF of the key terms"
                  >
                    {generatingPdf ? 'Generating…' : 'Generate PDF'}
                  </Button>
                )}
                {['draft', 'review'].includes(lease.status) && (
                  <>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleUploadPdf}
                    />
                    <Button
                      variant="secondary"
                      icon={Upload}
                      onClick={() => uploadInputRef.current?.click()}
                      loading={uploadingPdf}
                      disabled={uploadingPdf}
                      title="Upload the full AIR form PDF (print the preview to PDF from your browser)"
                    >
                      {uploadingPdf ? 'Uploading…' : 'Upload PDF'}
                    </Button>
                  </>
                )}
                {lease.lease_pdf_url && (
                  <Button variant="secondary" icon={Download} onClick={handleDownloadPdf}>
                    Download PDF
                  </Button>
                )}
                {['draft', 'review'].includes(lease.status) && (
                  <Button
                    variant="primary"
                    icon={Send}
                    onClick={handleSendForSignature}
                    loading={sending}
                    disabled={sending}
                  >
                    {sending ? 'Sending…' : 'Send for Signature'}
                  </Button>
                )}
                {lease.status === 'executed' && (
                  <Button variant="secondary" icon={Share2} onClick={handleShareDeal}>
                    {copied ? 'Copied!' : 'Share Deal'}
                  </Button>
                )}
              </>
            )}
          </div>
          {sendError && (
            <p className="text-xs text-destructive text-right max-w-sm">{sendError}</p>
          )}
        </div>
      </div>

      {/* AIR Form Sections */}
      <div className="space-y-4">
        {/* 1.1 Parties */}
        <CollapsibleSection number="Section 1.1" title="Parties" icon={Users} defaultOpen>
          <InfoRow
            label="Reference Date"
            value={lease.reference_date ? formatDate(lease.reference_date) : null}
          />
          <InfoRow
            label="Lessor"
            value={
              <span>
                {lease.lessor_name}
                {lease.lessor_entity_type && (
                  <span className="text-muted-foreground font-normal">
                    , {lease.lessor_entity_type}
                  </span>
                )}
              </span>
            }
          />
          <InfoRow
            label="Lessee"
            value={
              <span>
                {lease.lessee_name}
                {lease.lessee_entity_type && (
                  <span className="text-muted-foreground font-normal">
                    , {lease.lessee_entity_type}
                  </span>
                )}
              </span>
            }
          />
        </CollapsibleSection>

        {/* 1.2(a) Premises */}
        <CollapsibleSection
          number="Section 1.2(a)"
          title="Premises"
          icon={MapPin}
          defaultOpen
        >
          <InfoRow label="Address" value={lease.premises_address} />
          <InfoRow label="City" value={lease.premises_city} />
          <InfoRow label="County" value={lease.premises_county} />
          <InfoRow label="State" value={lease.premises_state} />
          <InfoRow label="ZIP" value={lease.premises_zip} />
          <InfoRow label="Square Footage" value={formatSqft(lease.premises_sf)} />
          <InfoRow label="Description" value={lease.premises_description} />
        </CollapsibleSection>

        {/* 1.2(b) Parking */}
        <CollapsibleSection number="Section 1.2(b)" title="Parking" icon={Car}>
          {isEditing ? (
            <>
              <EditableInfoRow label="Spaces" value={editFields.parking_spaces} field="parking_spaces" type="number" onChange={handleFieldChange} />
              <InfoRow
                label="Type"
                value={
                  lease.parking_type
                    ? lease.parking_type.charAt(0).toUpperCase() + lease.parking_type.slice(1)
                    : null
                }
              />
            </>
          ) : (
            <>
              <InfoRow label="Spaces" value={lease.parking_spaces?.toString()} />
              <InfoRow
                label="Type"
                value={
                  lease.parking_type
                    ? lease.parking_type.charAt(0).toUpperCase() + lease.parking_type.slice(1)
                    : null
                }
              />
            </>
          )}
        </CollapsibleSection>

        {/* 1.3 Term */}
        <CollapsibleSection number="Section 1.3" title="Term" icon={CalendarDays} defaultOpen>
          {isEditing ? (
            <>
              <EditableInfoRow label="Term (Years)" value={editFields.term_years} field="term_years" type="number" onChange={handleFieldChange} />
              <EditableInfoRow label="Term (Months)" value={editFields.term_months} field="term_months" type="number" onChange={handleFieldChange} />
              <EditableInfoRow label="Commencement Date" value={editFields.commencement_date} field="commencement_date" type="date" onChange={handleFieldChange} />
              <EditableInfoRow label="Expiration Date" value={editFields.expiration_date} field="expiration_date" type="date" onChange={handleFieldChange} />
            </>
          ) : (
            <>
              <InfoRow
                label="Duration"
                value={
                  [
                    lease.term_years
                      ? `${lease.term_years} year${lease.term_years > 1 ? 's' : ''}`
                      : null,
                    lease.term_months
                      ? `${lease.term_months} month${lease.term_months > 1 ? 's' : ''}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <InfoRow label="Commencement Date" value={formatDate(lease.commencement_date)} />
              <InfoRow label="Expiration Date" value={formatDate(lease.expiration_date)} />
            </>
          )}
        </CollapsibleSection>

        {/* 1.4 Early Possession */}
        <CollapsibleSection
          number="Section 1.4"
          title="Early Possession"
          icon={CalendarDays}
        >
          <div className="pt-2">
            <p className="text-sm">
              {lease.early_possession_terms || 'No early possession terms.'}
            </p>
          </div>
        </CollapsibleSection>

        {/* 1.5 Base Rent */}
        <CollapsibleSection
          number="Section 1.5"
          title="Base Rent"
          icon={DollarSign}
          defaultOpen
        >
          {isEditing ? (
            <>
              <EditableInfoRow label="Monthly Base Rent ($)" value={editFields.base_rent_monthly} field="base_rent_monthly" type="number" onChange={handleFieldChange} />
              <InfoRow
                label="Payable On"
                value={`${lease.base_rent_payable_day} of each month`}
              />
              <InfoRow
                label="Rent Commencement"
                value={
                  lease.base_rent_commencement ? formatDate(lease.base_rent_commencement) : null
                }
              />
            </>
          ) : (
            <>
              <InfoRow
                label="Monthly Base Rent"
                value={formatCurrency(lease.base_rent_monthly)}
              />
              <InfoRow
                label="Payable On"
                value={`${lease.base_rent_payable_day} of each month`}
              />
              <InfoRow
                label="Rent Commencement"
                value={
                  lease.base_rent_commencement ? formatDate(lease.base_rent_commencement) : null
                }
              />
            </>
          )}
        </CollapsibleSection>

        {/* 1.6 CAM / Operating Expenses */}
        <CollapsibleSection
          number="Section 1.6"
          title="CAM / Operating Expenses"
          icon={DollarSign}
        >
          {isEditing ? (
            <>
              <EditableInfoRow label="Percentage (%)" value={editFields.cam_percent} field="cam_percent" type="number" onChange={handleFieldChange} />
              <InfoRow label="Description" value={lease.cam_description} />
            </>
          ) : (
            <>
              <InfoRow
                label="Percentage"
                value={lease.cam_percent != null ? `${lease.cam_percent}%` : null}
              />
              <InfoRow label="Description" value={lease.cam_description} />
            </>
          )}
        </CollapsibleSection>

        {/* 1.7 Monies Upon Execution */}
        <CollapsibleSection
          number="Section 1.7"
          title="Monies Due Upon Execution"
          icon={DollarSign}
        >
          <InfoRow
            label="Base Rent"
            value={
              lease.exec_base_rent_amount != null
                ? `${formatCurrency(lease.exec_base_rent_amount)}${lease.exec_base_rent_period ? ` / ${lease.exec_base_rent_period}` : ''}`
                : null
            }
          />
          <InfoRow
            label="CAM / Operating Expenses"
            value={
              lease.exec_cam_amount != null
                ? `${formatCurrency(lease.exec_cam_amount)}${lease.exec_cam_period ? ` / ${lease.exec_cam_period}` : ''}`
                : null
            }
          />
          {isEditing ? (
            <EditableInfoRow label="Security Deposit ($)" value={editFields.security_deposit} field="security_deposit" type="number" onChange={handleFieldChange} />
          ) : (
            <InfoRow
              label="Security Deposit"
              value={
                lease.exec_security_deposit != null
                  ? formatCurrency(lease.exec_security_deposit)
                  : null
              }
            />
          )}
          {lease.exec_other_amount != null && (
            <InfoRow
              label={lease.exec_other_description || 'Other'}
              value={formatCurrency(lease.exec_other_amount)}
            />
          )}
          <div className="flex justify-between py-3 border-t border-border mt-1">
            <span className="text-sm font-semibold">Total Due Upon Execution</span>
            <span className="text-sm font-bold text-primary">
              {lease.total_due_upon_execution != null
                ? formatCurrency(lease.total_due_upon_execution)
                : '—'}
            </span>
          </div>
        </CollapsibleSection>

        {/* 1.8 Agreed Use */}
        <CollapsibleSection number="Section 1.8" title="Agreed Use" icon={Briefcase}>
          {isEditing ? (
            <EditableInfoRow label="Agreed Use" value={editFields.agreed_use} field="agreed_use" onChange={handleFieldChange} />
          ) : (
            <div className="pt-2">
              <p className="text-sm">{lease.agreed_use || 'Not specified.'}</p>
            </div>
          )}
        </CollapsibleSection>

        {/* 1.9 Insuring Party */}
        <CollapsibleSection
          number="Section 1.9"
          title="Insuring Party"
          icon={ShieldCheck}
        >
          <InfoRow label="Insuring Party" value={lease.insuring_party} />
        </CollapsibleSection>

        {/* 1.10 Brokers */}
        <CollapsibleSection number="Section 1.10" title="Brokers" icon={Users}>
          <InfoRow
            label="Representation Type"
            value={
              lease.broker_representation_type
                ? lease.broker_representation_type.charAt(0).toUpperCase() +
                  lease.broker_representation_type.slice(1) +
                  ' Agency'
                : null
            }
          />
          <InfoRow
            label="Lessor's Broker"
            value={
              lease.lessors_broker_name ? (
                <span>
                  {lease.lessors_broker_name}
                  {lease.lessors_broker_company && (
                    <span className="text-muted-foreground font-normal">
                      {' '}— {lease.lessors_broker_company}
                    </span>
                  )}
                </span>
              ) : null
            }
          />
          <InfoRow
            label="Lessee's Broker"
            value={
              lease.lessees_broker_name ? (
                <span>
                  {lease.lessees_broker_name}
                  {lease.lessees_broker_company && (
                    <span className="text-muted-foreground font-normal">
                      {' '}— {lease.lessees_broker_company}
                    </span>
                  )}
                </span>
              ) : null
            }
          />
          <InfoRow label="Payment Terms" value={lease.broker_payment_terms} />
        </CollapsibleSection>

        {/* 1.11 Guarantor */}
        <CollapsibleSection number="Section 1.11" title="Guarantor" icon={User}>
          <InfoRow label="Guarantor(s)" value={lease.guarantor_names || 'None'} />
        </CollapsibleSection>

        {/* 1.12 Attachments */}
        <CollapsibleSection number="Section 1.12" title="Attachments" icon={Paperclip}>
          {(lease.addendum_paragraph_start || lease.addendum_paragraph_end) && (
            <InfoRow
              label="Addendum"
              value={
                lease.addendum_paragraph_start && lease.addendum_paragraph_end
                  ? `Paragraphs ${lease.addendum_paragraph_start}–${lease.addendum_paragraph_end}`
                  : null
              }
            />
          )}
          <InfoRow
            label="Site Plan — Premises"
            value={
              lease.has_site_plan_premises ? (
                <span className="text-green-600 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Included
                </span>
              ) : (
                <span className="text-muted-foreground">Not included</span>
              )
            }
          />
          <InfoRow
            label="Site Plan — Project"
            value={
              lease.has_site_plan_project ? (
                <span className="text-green-600 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Included
                </span>
              ) : (
                <span className="text-muted-foreground">Not included</span>
              )
            }
          />
          <InfoRow
            label="Rules & Regulations"
            value={
              lease.has_rules_and_regulations ? (
                <span className="text-green-600 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Included
                </span>
              ) : (
                <span className="text-muted-foreground">Not included</span>
              )
            }
          />
          {lease.other_attachments && (
            <InfoRow label="Other" value={lease.other_attachments} />
          )}
        </CollapsibleSection>

        {/* Rent Escalation Schedule */}
        {escalations.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <DollarSign className="h-4.5 w-4.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Rent Escalation Schedule</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left font-medium text-muted-foreground"
                    >
                      Year
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left font-medium text-muted-foreground"
                    >
                      Effective Date
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium text-muted-foreground"
                    >
                      $/SF
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium text-muted-foreground"
                    >
                      Monthly Amount
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left font-medium text-muted-foreground"
                    >
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.map((esc) => (
                    <tr
                      key={esc.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-3 font-medium">Year {esc.year_number}</td>
                      <td className="px-5 py-3">{formatDate(esc.effective_date)}</td>
                      <td className="px-5 py-3 text-right font-mono">
                        ${esc.rent_per_sqft.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatCurrency(esc.monthly_amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {esc.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* DocuSign Status */}
        {lease.docusign_envelope_id && (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">DocuSign Status</h3>
                </div>
                <Badge status={lease.docusign_status || 'draft'} />
              </div>
            </div>
            <div className="p-5">
              {lease.sent_for_signature_at && (
                <p className="text-xs text-muted-foreground mb-4">
                  Sent {formatDate(lease.sent_for_signature_at)}
                  {lease.docusign_envelope_id && (
                    <span>
                      {' '}· Envelope:{' '}
                      <span className="font-mono">{lease.docusign_envelope_id}</span>
                    </span>
                  )}
                </p>
              )}
              <div className="space-y-3">
                {signers.map((signer) => {
                  const config =
                    signerStatusConfig[signer.status] || signerStatusConfig.sent;
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={signer.name}
                      className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{signer.name}</p>
                        <p className="text-xs text-muted-foreground">{signer.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn('h-4 w-4', config.classes)} />
                        <span className={cn('text-sm font-medium', config.classes)}>
                          {signer.status === 'completed'
                            ? 'Signed'
                            : signer.status === 'sent'
                              ? 'Awaiting Signature'
                              : 'Declined'}
                        </span>
                        {signer.signedAt && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDate(signer.signedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Collaborators & Comments */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CollaboratorsPanel dealType="lease" dealId={lease.id} />
        <CommentsPanel dealType="lease" dealId={lease.id} />
      </div>
    </div>
  );
}
