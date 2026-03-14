'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Send,
  Download,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatSqft } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import type { Lease, RentEscalation, LeaseStatus } from '@/types/database';

// ============================================================
// Mock Data
// ============================================================

const mockLease: Lease = {
  id: 'lease-001',
  loi_id: 'loi-001',
  property_id: 'prop-001',
  unit_id: 'unit-001',
  tenant_contact_id: 'contact-001',
  landlord_contact_id: 'contact-002',
  broker_contact_id: 'contact-003',
  guarantor_contact_id: 'contact-004',
  status: 'sent_for_signature',
  form_type: 'AIR-NNN',
  form_version: '2024 Rev.',
  reference_date: '2026-03-01',
  lessor_name: 'Gillespie Commerce Center LLC',
  lessor_entity_type: 'a California limited liability company',
  lessee_name: 'Pacific Coast Welding LLC',
  lessee_entity_type: 'a California limited liability company',
  premises_address: '1234 Gillespie Way, Suite 104',
  premises_city: 'El Cajon',
  premises_county: 'San Diego',
  premises_state: 'CA',
  premises_zip: '92020',
  premises_sf: 2721,
  premises_description:
    'Approximately 2,721 rentable square feet of industrial/warehouse space, including approximately 400 square feet of office space, as outlined on the attached Site Plan.',
  parking_spaces: 6,
  parking_type: 'unreserved',
  term_years: 3,
  term_months: 0,
  commencement_date: '2026-05-01',
  expiration_date: '2029-04-30',
  early_possession_terms:
    'Lessee shall have early access to the Premises beginning April 15, 2026, for the purpose of setting up equipment and fixtures only. No rent shall accrue during the early possession period.',
  base_rent_monthly: 3537.30,
  base_rent_payable_day: '1st',
  base_rent_commencement: '2026-05-01',
  cam_percent: 100,
  cam_description:
    'Lessee shall pay 100% of NNN operating expenses, including but not limited to real estate taxes, insurance, and common area maintenance.',
  exec_base_rent_amount: 3537.30,
  exec_base_rent_period: 'month',
  exec_cam_amount: 680.25,
  exec_cam_period: 'month',
  exec_security_deposit: 7074.60,
  exec_other_amount: null,
  exec_other_description: null,
  total_due_upon_execution: 11292.15,
  agreed_use: 'Metal fabrication, welding services, and related industrial activities, subject to compliance with all applicable zoning, environmental, and governmental regulations.',
  insuring_party: 'Lessee',
  broker_representation_type: 'dual',
  lessors_broker_name: 'Neil Bajaj',
  lessors_broker_company: 'Rocket Glass, Inc.',
  lessees_broker_name: 'Neil Bajaj',
  lessees_broker_company: 'Rocket Glass, Inc.',
  broker_payment_terms: 'Per separate commission agreement between Lessor and Broker.',
  guarantor_names: 'Maria Martinez, individually',
  addendum_paragraph_start: 51,
  addendum_paragraph_end: 58,
  has_site_plan_premises: true,
  has_site_plan_project: true,
  has_rules_and_regulations: true,
  other_attachments: 'Exhibit A — Equipment Installation Requirements',
  security_deposit: 7074.60,
  docusign_envelope_id: 'env-abc-123-def-456',
  docusign_status: 'sent',
  sent_for_signature_at: '2026-03-12T10:30:00Z',
  signed_date: null,
  lease_pdf_url: '#',
  executed_pdf_url: null,
  created_at: '2026-03-10T09:00:00Z',
  updated_at: '2026-03-12T10:30:00Z',
};

const mockEscalations: RentEscalation[] = [
  {
    id: 'esc-001',
    lease_id: 'lease-001',
    year_number: 1,
    effective_date: '2026-05-01',
    rent_per_sqft: 1.30,
    monthly_amount: 3537.30,
    notes: 'Base year',
  },
  {
    id: 'esc-002',
    lease_id: 'lease-001',
    year_number: 2,
    effective_date: '2027-05-01',
    rent_per_sqft: 1.34,
    monthly_amount: 3646.14,
    notes: '3% annual increase',
  },
  {
    id: 'esc-003',
    lease_id: 'lease-001',
    year_number: 3,
    effective_date: '2028-05-01',
    rent_per_sqft: 1.38,
    monthly_amount: 3754.98,
    notes: '3% annual increase',
  },
];

const mockProperty = { name: 'Gillespie Commerce Center' };
const mockUnit = { suite_number: '104' };

const mockDocuSignSigners = [
  {
    name: 'Gillespie Commerce Center LLC (John Gillespie)',
    role: 'Lessor',
    status: 'completed' as const,
    signedAt: '2026-03-12T16:45:00Z',
  },
  {
    name: 'Pacific Coast Welding LLC (John Martinez)',
    role: 'Lessee',
    status: 'sent' as const,
    signedAt: null,
  },
  {
    name: 'Maria Martinez',
    role: 'Guarantor',
    status: 'sent' as const,
    signedAt: null,
  },
];

// ============================================================
// Helpers
// ============================================================

const leaseStatusConfig: Record<LeaseStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  review: { label: 'In Review', classes: 'bg-blue-100 text-blue-700' },
  sent_for_signature: { label: 'Sent for Signature', classes: 'bg-amber-100 text-amber-700' },
  partially_signed: { label: 'Partially Signed', classes: 'bg-orange-100 text-orange-700' },
  executed: { label: 'Executed', classes: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-600' },
  terminated: { label: 'Terminated', classes: 'bg-red-100 text-red-700' },
};

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
      {isOpen && <div id={sectionId} className="px-5 pb-5 border-t border-border/50">{children}</div>}
    </Card>
  );
}

// ============================================================
// Page Component
// ============================================================

export default function LeaseDetailPage() {
  const lease = mockLease;
  const escalations = mockEscalations;
  const property = mockProperty;
  const unit = mockUnit;
  const signers = mockDocuSignSigners;
  const _statusInfo = leaseStatusConfig[lease.status];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back navigation */}
      <BackButton href="/leases" label="Back to Leases" className="mb-6" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">
              {property.name} — Suite {unit.suite_number}
            </h1>
            <Badge status={lease.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {lease.lessee_name}
            <span className="mx-2">·</span>
            {lease.lessor_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            AIR {lease.form_type} · {lease.form_version}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Pencil}>
            Edit Lease
          </Button>
          <Button variant="primary" icon={Send}>
            Send for Signature
          </Button>
          <Button variant="secondary" icon={Download}>
            PDF
          </Button>
        </div>
      </div>

      {/* AIR Form Sections */}
      <div className="space-y-4">
        {/* 1.1 Parties */}
        <CollapsibleSection number="Section 1.1" title="Parties" icon={Users} defaultOpen>
          <InfoRow label="Reference Date" value={lease.reference_date ? formatDate(lease.reference_date) : null} />
          <InfoRow
            label="Lessor"
            value={
              <span>
                {lease.lessor_name}
                {lease.lessor_entity_type && (
                  <span className="text-muted-foreground font-normal">, {lease.lessor_entity_type}</span>
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
                  <span className="text-muted-foreground font-normal">, {lease.lessee_entity_type}</span>
                )}
              </span>
            }
          />
        </CollapsibleSection>

        {/* 1.2(a) Premises */}
        <CollapsibleSection number="Section 1.2(a)" title="Premises" icon={MapPin} defaultOpen>
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
          <InfoRow label="Spaces" value={lease.parking_spaces?.toString()} />
          <InfoRow label="Type" value={lease.parking_type ? lease.parking_type.charAt(0).toUpperCase() + lease.parking_type.slice(1) : null} />
        </CollapsibleSection>

        {/* 1.3 Term */}
        <CollapsibleSection number="Section 1.3" title="Term" icon={CalendarDays} defaultOpen>
          <InfoRow
            label="Duration"
            value={
              [
                lease.term_years ? `${lease.term_years} year${lease.term_years > 1 ? 's' : ''}` : null,
                lease.term_months ? `${lease.term_months} month${lease.term_months > 1 ? 's' : ''}` : null,
              ]
                .filter(Boolean)
                .join(', ') || null
            }
          />
          <InfoRow label="Commencement Date" value={formatDate(lease.commencement_date)} />
          <InfoRow label="Expiration Date" value={formatDate(lease.expiration_date)} />
        </CollapsibleSection>

        {/* 1.4 Early Possession */}
        <CollapsibleSection number="Section 1.4" title="Early Possession" icon={CalendarDays}>
          <div className="pt-2">
            <p className="text-sm">{lease.early_possession_terms || 'No early possession terms.'}</p>
          </div>
        </CollapsibleSection>

        {/* 1.5 Base Rent */}
        <CollapsibleSection number="Section 1.5" title="Base Rent" icon={DollarSign} defaultOpen>
          <InfoRow label="Monthly Base Rent" value={formatCurrency(lease.base_rent_monthly)} />
          <InfoRow label="Payable On" value={`${lease.base_rent_payable_day} of each month`} />
          <InfoRow
            label="Rent Commencement"
            value={lease.base_rent_commencement ? formatDate(lease.base_rent_commencement) : null}
          />
        </CollapsibleSection>

        {/* 1.6 CAM / Operating Expenses */}
        <CollapsibleSection number="Section 1.6" title="CAM / Operating Expenses" icon={DollarSign}>
          <InfoRow label="Percentage" value={lease.cam_percent != null ? `${lease.cam_percent}%` : null} />
          <InfoRow label="Description" value={lease.cam_description} />
        </CollapsibleSection>

        {/* 1.7 Monies Upon Execution */}
        <CollapsibleSection number="Section 1.7" title="Monies Due Upon Execution" icon={DollarSign}>
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
          <InfoRow
            label="Security Deposit"
            value={lease.exec_security_deposit != null ? formatCurrency(lease.exec_security_deposit) : null}
          />
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
          <div className="pt-2">
            <p className="text-sm">{lease.agreed_use || 'Not specified.'}</p>
          </div>
        </CollapsibleSection>

        {/* 1.9 Insuring Party */}
        <CollapsibleSection number="Section 1.9" title="Insuring Party" icon={ShieldCheck}>
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
                    <span className="text-muted-foreground font-normal"> — {lease.lessors_broker_company}</span>
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
                    <span className="text-muted-foreground font-normal"> — {lease.lessees_broker_company}</span>
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
                  <th scope="col" className="px-5 py-3 text-left font-medium text-muted-foreground">Year</th>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Effective Date
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium text-muted-foreground">$/SF</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Monthly Amount
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-muted-foreground">Notes</th>
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
                    <td className="px-5 py-3 text-muted-foreground">{esc.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* DocuSign Status */}
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
                    {' '}
                    · Envelope: <span className="font-mono">{lease.docusign_envelope_id}</span>
                  </span>
                )}
              </p>
            )}
            <div className="space-y-3">
              {signers.map((signer) => {
                const config = signerStatusConfig[signer.status] || signerStatusConfig.sent;
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
      </div>
    </div>
  );
}
