'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Users,
  MapPin,
  Car,
  CalendarDays,
  DollarSign,
  ShieldCheck,
  Briefcase,
  FileText,
  Paperclip,
  User,
  Save,
  Eye,
  Send,
  Import,
  Calculator,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  mapLoiToLease,
  calculateEscalationSchedule,
  calculateTotalConsideration,
} from '@/lib/lease/generate';
import type {
  LoiSection,
  RentEscalation,
  LoiWithRelations,
} from '@/types/database';

// ============================================================
// Section config
// ============================================================

interface AirSectionConfig {
  number: string;
  title: string;
  icon: React.ElementType;
  key: string;
}

const AIR_SECTIONS: AirSectionConfig[] = [
  { number: '1.1', title: 'Parties', icon: Users, key: 'parties' },
  { number: '1.2(a)', title: 'Premises', icon: MapPin, key: 'premises' },
  { number: '1.2(b)', title: 'Parking', icon: Car, key: 'parking' },
  { number: '1.3', title: 'Term', icon: CalendarDays, key: 'term' },
  { number: '1.4', title: 'Early Possession', icon: CalendarDays, key: 'early_possession' },
  { number: '1.5', title: 'Base Rent', icon: DollarSign, key: 'base_rent' },
  { number: '1.6', title: 'CAM / Operating Expenses', icon: DollarSign, key: 'cam' },
  { number: '1.7', title: 'Monies Due Upon Execution', icon: DollarSign, key: 'monies' },
  { number: '1.8', title: 'Agreed Use', icon: Briefcase, key: 'agreed_use' },
  { number: '1.9', title: 'Insuring Party', icon: ShieldCheck, key: 'insuring' },
  { number: '1.10', title: 'Brokers', icon: Users, key: 'brokers' },
  { number: '1.11', title: 'Guarantor', icon: User, key: 'guarantor' },
  { number: '1.12', title: 'Attachments', icon: Paperclip, key: 'attachments' },
];

// ============================================================
// Default lease form state
// ============================================================

function getDefaultLeaseForm(): Record<string, string | number | boolean | null> {
  return {
    // 1.1
    lessor_name: '', lessor_entity_type: '', lessee_name: '', lessee_entity_type: '',
    reference_date: new Date().toISOString().slice(0, 10),
    // 1.2(a)
    premises_address: '', premises_city: '', premises_county: '', premises_state: 'CA',
    premises_zip: '', premises_sf: '', premises_description: '',
    // 1.2(b)
    parking_spaces: '', parking_type: 'unreserved',
    // 1.3
    term_years: '', term_months: '', commencement_date: '', expiration_date: '',
    // 1.4
    early_possession_terms: '',
    // 1.5
    base_rent_monthly: '', base_rent_payable_day: '1st', base_rent_commencement: '',
    // 1.6
    cam_percent: '', cam_description: '',
    // 1.7
    exec_base_rent_amount: '', exec_cam_amount: '', exec_security_deposit: '',
    exec_other_amount: '', exec_other_description: '', total_due_upon_execution: '',
    // 1.8
    agreed_use: '',
    // 1.9
    insuring_party: 'Lessee',
    // 1.10
    broker_representation_type: 'dual',
    lessors_broker_name: '', lessors_broker_company: '',
    lessees_broker_name: '', lessees_broker_company: '',
    broker_payment_terms: '',
    // 1.11
    guarantor_names: '',
    // 1.12
    addendum_paragraph_start: '', addendum_paragraph_end: '',
    has_site_plan_premises: true, has_site_plan_project: true,
    has_rules_and_regulations: true, other_attachments: '',
    // Security
    security_deposit: '',
    // Escalation params
    escalation_annual_increase: '3',
  };
}

// ============================================================
// LOI label helper
// ============================================================

function loiLabel(loi: LoiWithRelations): string {
  const tenant =
    loi.tenant?.company_name ||
    [loi.tenant?.first_name, loi.tenant?.last_name].filter(Boolean).join(' ') ||
    'Unknown Tenant';
  const property = loi.property?.name ?? 'Unknown Property';
  const suite = loi.unit?.suite_number ? `, Suite ${loi.unit.suite_number}` : '';
  return `${tenant} — ${property}${suite}`;
}

// ============================================================
// Component
// ============================================================

export default function CreateLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLoiId = searchParams.get('loi') ?? '';

  const [mode, setMode] = useState<'loi' | 'manual'>('loi');
  const [selectedLoiId, setSelectedLoiId] = useState(preselectedLoiId);
  const [form, setForm] = useState(getDefaultLeaseForm());
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['parties', 'premises', 'base_rent', 'term']),
  );
  const [importedSections, setImportedSections] = useState<number | null>(null);
  const [escalations, setEscalations] = useState<RentEscalation[]>([]);
  const [showEscalations, setShowEscalations] = useState(false);
  const [leaseErrors, setLeaseErrors] = useState<Record<string, string>>({});
  const [shakeKey, setShakeKey] = useState(0);

  // Active LOI being imported (stored so we can pass IDs when submitting)
  const [importedLoi, setImportedLoi] = useState<LoiWithRelations | null>(null);

  // Agreed LOIs for the dropdown
  const [agreedLois, setAgreedLois] = useState<LoiWithRelations[]>([]);
  const [loadingLois, setLoadingLois] = useState(true);
  const [loiLoadError, setLoiLoadError] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load agreed LOIs on mount
  useEffect(() => {
    async function loadAgreedLois() {
      setLoadingLois(true);
      setLoiLoadError(null);
      try {
        const res = await fetch('/api/leases/agreed-lois');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load LOIs');
        setAgreedLois(json.lois ?? []);
      } catch (err) {
        setLoiLoadError((err as Error).message);
      } finally {
        setLoadingLois(false);
      }
    }
    loadAgreedLois();
  }, []);

  // Auto-import LOI if preselected via query param
  useEffect(() => {
    if (preselectedLoiId && agreedLois.length > 0 && !importedLoi) {
      const loi = agreedLois.find((l) => l.id === preselectedLoiId);
      if (loi) {
        setSelectedLoiId(loi.id);
        setImportedLoi(loi);
        // Pre-fill form from LOI sections
        const sectionMap: Record<string, string> = {};
        for (const s of (loi.sections ?? [])) {
          sectionMap[s.section_key] = s.agreed_value ?? s.proposed_value ?? '';
        }
        setForm((prev) => ({
          ...prev,
          lessee_name: loi.tenant?.company_name ?? '',
          premises_address: loi.property?.address ?? '',
          premises_sf: String(loi.unit?.sf ?? ''),
          base_monthly_rent: sectionMap.base_rent ?? prev.base_monthly_rent,
          lease_term_months: sectionMap.term ?? prev.lease_term_months,
          cam_percentage: sectionMap.cam ?? prev.cam_percentage,
          security_deposit: sectionMap.security_deposit ?? prev.security_deposit,
          parking_spaces: sectionMap.parking ?? prev.parking_spaces,
        }));
      }
    }
  }, [preselectedLoiId, agreedLois, importedLoi]);

  // ---- Helpers ----

  function updateField(key: string, value: string | number | boolean | null) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setLeaseErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ---- Import from LOI ----

  function handleImportFromLoi() {
    const loi = agreedLois.find((l) => l.id === selectedLoiId);
    if (!loi) return;

    setImportedLoi(loi);

    const metadata = {
      property: loi.property,
      unit: loi.unit,
      tenant: loi.tenant,
      landlord: loi.landlord,
      broker: loi.broker,
    };

    const result = mapLoiToLease(loi.sections as LoiSection[], metadata);
    const lease = result.lease;

    // Populate form from lease object
    const updates: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(lease)) {
      if (
        key === 'status' || key === 'loi_id' || key === 'property_id' ||
        key === 'unit_id' || key === 'tenant_contact_id' ||
        key === 'landlord_contact_id' || key === 'broker_contact_id' ||
        key === 'guarantor_contact_id' || key === 'form_type' ||
        key === 'form_version' || key === 'docusign_envelope_id' ||
        key === 'docusign_status' || key === 'sent_for_signature_at' ||
        key === 'signed_date' || key === 'lease_pdf_url' ||
        key === 'executed_pdf_url'
      ) {
        continue;
      }
      if (value === null || value === undefined) {
        updates[key] = '';
      } else if (typeof value === 'boolean') {
        updates[key] = value;
      } else {
        updates[key] = String(value);
      }
    }

    setForm((prev) => ({ ...prev, ...updates }));
    setImportedSections(result.populatedCount);

    const escs = result.escalations.map((e, i) => ({
      ...e,
      id: `esc-gen-${i}`,
      lease_id: '',
    })) as RentEscalation[];
    setEscalations(escs);
    setShowEscalations(escs.length > 0);

    setExpanded(new Set(AIR_SECTIONS.map((s) => s.key)));
  }

  // ---- Generate escalation schedule ----

  function handleGenerateEscalations() {
    const baseRent = parseFloat(String(form.base_rent_monthly)) || 0;
    const termYears = parseInt(String(form.term_years)) || 0;
    const termMonthsExtra = parseInt(String(form.term_months)) || 0;
    const totalMonths = termYears * 12 + termMonthsExtra;
    const annualIncrease =
      parseFloat(String(form.escalation_annual_increase)) || 3;
    const sf = parseFloat(String(form.premises_sf)) || 0;
    const commencement = String(form.commencement_date);

    if (!baseRent || !totalMonths || !commencement) return;

    const schedule = calculateEscalationSchedule(
      baseRent,
      totalMonths,
      annualIncrease,
      commencement,
      sf,
    );
    const escs = schedule.map((e, i) => ({
      ...e,
      id: `esc-gen-${i}`,
    })) as RentEscalation[];
    setEscalations(escs);
    setShowEscalations(true);
  }

  // ---- Validation ----

  function validateLease(): boolean {
    const errors: Record<string, string> = {};

    if (!String(form.lessor_name).trim()) errors.lessor_name = 'Lessor name is required';
    if (!String(form.lessee_name).trim()) errors.lessee_name = 'Lessee name is required';
    if (!String(form.premises_address).trim()) errors.premises_address = 'Premises address is required';
    if (!String(form.premises_city).trim()) errors.premises_city = 'City is required';
    if (!String(form.premises_state).trim()) errors.premises_state = 'State is required';
    else if (String(form.premises_state).trim().length !== 2)
      errors.premises_state = 'State must be a 2-character abbreviation';
    if (!String(form.premises_zip).trim()) errors.premises_zip = 'ZIP code is required';
    else if (!/^\d{5}(-\d{4})?$/.test(String(form.premises_zip).trim()))
      errors.premises_zip = 'Enter a valid ZIP code (e.g. 92020)';
    if (
      !String(form.premises_sf).trim() ||
      parseFloat(String(form.premises_sf)) <= 0
    )
      errors.premises_sf = 'Square footage must be a positive number';
    if (!String(form.commencement_date).trim())
      errors.commencement_date = 'Commencement date is required';
    if (!String(form.expiration_date).trim())
      errors.expiration_date = 'Expiration date is required';
    if (String(form.commencement_date).trim() && String(form.expiration_date).trim()) {
      if (
        new Date(String(form.expiration_date)) <=
        new Date(String(form.commencement_date))
      ) {
        errors.expiration_date = 'Expiration date must be after commencement date';
      }
    }
    if (
      !String(form.base_rent_monthly).trim() ||
      parseFloat(String(form.base_rent_monthly)) <= 0
    ) {
      errors.base_rent_monthly = 'Monthly base rent must be a positive number';
    }

    setLeaseErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShakeKey((k) => k + 1);
      const sectionMap: Record<string, string> = {
        lessor_name: 'parties', lessee_name: 'parties',
        premises_address: 'premises', premises_city: 'premises',
        premises_state: 'premises', premises_zip: 'premises', premises_sf: 'premises',
        commencement_date: 'term', expiration_date: 'term',
        base_rent_monthly: 'base_rent',
      };
      setExpanded((prev) => {
        const next = new Set(prev);
        Object.keys(errors).forEach((k) => {
          if (sectionMap[k]) next.add(sectionMap[k]);
        });
        return next;
      });
      return false;
    }
    return true;
  }

  // ---- Submit ----

  async function handleSubmit(status: 'draft' | 'review') {
    if (!validateLease()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Build lease payload from form + importedLoi (if any)
      const payload: Record<string, unknown> = {
        // IDs from importedLoi when available, otherwise the form won't have them
        // (manual entry currently doesn't surface contact/property pickers — future work)
        property_id: importedLoi?.property_id ?? importedLoi?.property?.id ?? null,
        unit_id: importedLoi?.unit_id ?? importedLoi?.unit?.id ?? null,
        tenant_contact_id: importedLoi?.tenant_contact_id ?? null,
        landlord_contact_id: importedLoi?.landlord_contact_id ?? null,
        broker_contact_id: importedLoi?.broker_contact_id ?? null,
        // LOI type has no guarantor_contact_id; leave null (can be set later)
        guarantor_contact_id: null,
        loi_id: importedLoi?.id ?? null,
        status,
        form_type: 'AIR-NNN',
        form_version: '2024 Rev.',

        // Scalar fields from form state
        reference_date: String(form.reference_date) || null,
        lessor_name: String(form.lessor_name),
        lessor_entity_type: String(form.lessor_entity_type) || null,
        lessee_name: String(form.lessee_name),
        lessee_entity_type: String(form.lessee_entity_type) || null,
        premises_address: String(form.premises_address),
        premises_city: String(form.premises_city),
        premises_county: String(form.premises_county) || null,
        premises_state: String(form.premises_state),
        premises_zip: String(form.premises_zip) || null,
        premises_sf: parseFloat(String(form.premises_sf)) || 0,
        premises_description: String(form.premises_description) || null,
        parking_spaces: parseInt(String(form.parking_spaces)) || null,
        parking_type: String(form.parking_type) || 'unreserved',
        term_years: parseInt(String(form.term_years)) || null,
        term_months: parseInt(String(form.term_months)) || null,
        commencement_date: String(form.commencement_date),
        expiration_date: String(form.expiration_date),
        early_possession_terms: String(form.early_possession_terms) || null,
        base_rent_monthly: parseFloat(String(form.base_rent_monthly)) || 0,
        base_rent_payable_day: String(form.base_rent_payable_day) || '1st',
        base_rent_commencement: String(form.base_rent_commencement) || null,
        cam_percent: parseFloat(String(form.cam_percent)) || null,
        cam_description: String(form.cam_description) || '',
        exec_base_rent_amount: parseFloat(String(form.exec_base_rent_amount)) || null,
        exec_base_rent_period: 'month',
        exec_cam_amount: parseFloat(String(form.exec_cam_amount)) || null,
        exec_cam_period: form.exec_cam_amount ? 'month' : null,
        exec_security_deposit: parseFloat(String(form.exec_security_deposit)) || null,
        exec_other_amount: parseFloat(String(form.exec_other_amount)) || null,
        exec_other_description: String(form.exec_other_description) || null,
        total_due_upon_execution:
          parseFloat(String(form.total_due_upon_execution)) || null,
        agreed_use: String(form.agreed_use) || null,
        insuring_party: String(form.insuring_party) || 'Lessee',
        broker_representation_type: String(form.broker_representation_type) || null,
        lessors_broker_name: String(form.lessors_broker_name) || null,
        lessors_broker_company: String(form.lessors_broker_company) || null,
        lessees_broker_name: String(form.lessees_broker_name) || null,
        lessees_broker_company: String(form.lessees_broker_company) || null,
        broker_payment_terms: String(form.broker_payment_terms) || null,
        guarantor_names: String(form.guarantor_names) || null,
        addendum_paragraph_start:
          parseInt(String(form.addendum_paragraph_start)) || null,
        addendum_paragraph_end:
          parseInt(String(form.addendum_paragraph_end)) || null,
        has_site_plan_premises: Boolean(form.has_site_plan_premises),
        has_site_plan_project: Boolean(form.has_site_plan_project),
        has_rules_and_regulations: Boolean(form.has_rules_and_regulations),
        other_attachments: String(form.other_attachments) || null,
        security_deposit: parseFloat(String(form.security_deposit)) || null,

        // Rent escalations (strip transient `id` field before sending)
        escalations: escalations.map(({ id: _id, lease_id: _lid, ...rest }) => rest),
      };

      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create lease');

      router.push(`/leases/${json.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  }

  // ---- Input helpers ----

  function inputClassFor(field?: string) {
    const hasErr = field && leaseErrors[field];
    return cn(
      'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none',
      hasErr
        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
        : 'border-border focus:border-primary focus:ring-1 focus:ring-primary',
    );
  }
  const inputClass =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
  const labelClass = 'mb-1.5 block text-sm font-medium';
  const selectClass = inputClass;

  // ---- Render ----

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back navigation */}
      <BackButton href="/leases" label="Back to Leases" className="mb-4" />

      <h1 className="text-2xl font-bold">Create Lease</h1>
      <p className="mt-1 text-muted-foreground">
        Create a new lease from an agreed LOI or enter terms manually.
      </p>

      {/* Submission error */}
      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Mode Toggle                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 flex gap-2">
        <Button
          variant={mode === 'loi' ? 'primary' : 'secondary'}
          icon={Import}
          onClick={() => setMode('loi')}
        >
          From LOI
        </Button>
        <Button
          variant={mode === 'manual' ? 'primary' : 'secondary'}
          icon={FileText}
          onClick={() => setMode('manual')}
        >
          Manual Entry
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* LOI Import Section                                                  */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'loi' && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Import from Agreed LOI</h2>

            {loiLoadError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to load LOIs: {loiLoadError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={selectedLoiId}
                  onChange={(e) => setSelectedLoiId(e.target.value)}
                  className={selectClass}
                  disabled={loadingLois}
                >
                  <option value="">
                    {loadingLois
                      ? 'Loading agreed LOIs…'
                      : agreedLois.length === 0
                      ? 'No agreed LOIs found'
                      : 'Select an agreed LOI…'}
                  </option>
                  {agreedLois.map((loi) => (
                    <option key={loi.id} value={loi.id}>
                      {loiLabel(loi)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="primary"
                icon={Import}
                onClick={handleImportFromLoi}
                disabled={!selectedLoiId || loadingLois}
              >
                Import from LOI
              </Button>
            </div>

            {importedSections !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  <span className="font-semibold">{importedSections} of 13</span>{' '}
                  sections auto-populated from LOI. Review and edit below.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* AIR Form Sections                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div key={shakeKey} className={cn('mt-6 space-y-3', shakeKey > 0 && 'animate-shake')}>
        {AIR_SECTIONS.map((sec) => {
          const isOpen = expanded.has(sec.key);
          const Icon = sec.icon;

          return (
            <Card key={sec.key} className="overflow-hidden">
              <button
                onClick={() => toggleSection(sec.key)}
                className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Section {sec.number}
                    </span>
                    <h3 className="text-sm font-semibold">{sec.title}</h3>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4">
                  <SectionEditor
                    sectionKey={sec.key}
                    form={form}
                    onUpdate={updateField}
                    inputClass={inputClass}
                    inputClassFor={inputClassFor}
                    labelClass={labelClass}
                    selectClass={selectClass}
                    errors={leaseErrors}
                  />
                </div>
              )}
            </Card>
          );
        })}

        {/* ---- Rent Escalation Schedule ---- */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4.5 w-4.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Rent Escalation Schedule</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    Annual Increase %
                  </label>
                  <input
                    type="text"
                    value={String(form.escalation_annual_increase)}
                    onChange={(e) =>
                      updateField('escalation_annual_increase', e.target.value)
                    }
                    className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-sm text-center outline-none focus:border-primary"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Calculator}
                  onClick={handleGenerateEscalations}
                >
                  Generate Schedule
                </Button>
              </div>
            </div>
          </div>
          {showEscalations && escalations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                      Year
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                      Effective Date
                    </th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      $/SF
                    </th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Monthly Amount
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">
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
                        {esc.notes || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold">
                      Total Consideration
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-primary">
                      {formatCurrency(
                        calculateTotalConsideration(
                          parseFloat(String(form.base_rent_monthly)) || 0,
                          (parseInt(String(form.term_years)) || 0) * 12 +
                            (parseInt(String(form.term_months)) || 0),
                          escalations.map((e) => ({ ...e, lease_id: '' })),
                        ),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Action Bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mt-8">
        <CardContent className="flex items-center justify-end gap-3 px-5 py-4">
          <Button
            variant="secondary"
            icon={submitting ? Loader2 : Save}
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
          >
            Save as Draft
          </Button>
          <Button variant="secondary" icon={Eye} disabled={submitting}>
            Preview Lease
          </Button>
          <Button
            variant="secondary"
            icon={Calculator}
            onClick={handleGenerateEscalations}
            disabled={submitting}
          >
            Generate Escalation Schedule
          </Button>
          <Button
            variant="primary"
            icon={submitting ? Loader2 : Send}
            onClick={() => handleSubmit('review')}
            disabled={submitting}
          >
            Send for Signature
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Section Editor
// ============================================================

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function SectionEditor({
  sectionKey,
  form,
  onUpdate,
  inputClass,
  inputClassFor,
  labelClass,
  selectClass,
  errors,
}: {
  sectionKey: string;
  form: Record<string, string | number | boolean | null>;
  onUpdate: (key: string, value: string | number | boolean | null) => void;
  inputClass: string;
  inputClassFor: (field?: string) => string;
  labelClass: string;
  selectClass: string;
  errors: Record<string, string>;
}) {
  const textareaClass = cn(inputClass, 'resize-none');

  switch (sectionKey) {
    case 'parties':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Reference Date</label>
            <input
              type="date"
              value={String(form.reference_date || '')}
              onChange={(e) => onUpdate('reference_date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div />
          <div>
            <label className={labelClass}>
              Lessor Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.lessor_name || '')}
              onChange={(e) => onUpdate('lessor_name', e.target.value)}
              placeholder="e.g. ABC Properties LLC"
              className={inputClassFor('lessor_name')}
            />
            <FieldError message={errors.lessor_name} />
          </div>
          <div>
            <label className={labelClass}>Lessor Entity Type</label>
            <input
              type="text"
              value={String(form.lessor_entity_type || '')}
              onChange={(e) => onUpdate('lessor_entity_type', e.target.value)}
              placeholder="e.g. a California limited liability company"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Lessee Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.lessee_name || '')}
              onChange={(e) => onUpdate('lessee_name', e.target.value)}
              placeholder="e.g. Tenant Co. LLC"
              className={inputClassFor('lessee_name')}
            />
            <FieldError message={errors.lessee_name} />
          </div>
          <div>
            <label className={labelClass}>Lessee Entity Type</label>
            <input
              type="text"
              value={String(form.lessee_entity_type || '')}
              onChange={(e) => onUpdate('lessee_entity_type', e.target.value)}
              placeholder="e.g. a California corporation"
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'premises':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Address <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.premises_address || '')}
              onChange={(e) => onUpdate('premises_address', e.target.value)}
              placeholder="e.g. 1234 Commerce Blvd, Suite 101"
              className={inputClassFor('premises_address')}
            />
            <FieldError message={errors.premises_address} />
          </div>
          <div>
            <label className={labelClass}>
              City <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.premises_city || '')}
              onChange={(e) => onUpdate('premises_city', e.target.value)}
              className={inputClassFor('premises_city')}
            />
            <FieldError message={errors.premises_city} />
          </div>
          <div>
            <label className={labelClass}>County</label>
            <input
              type="text"
              value={String(form.premises_county || '')}
              onChange={(e) => onUpdate('premises_county', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              State <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.premises_state || '')}
              onChange={(e) => onUpdate('premises_state', e.target.value)}
              className={inputClassFor('premises_state')}
            />
            <FieldError message={errors.premises_state} />
          </div>
          <div>
            <label className={labelClass}>
              ZIP <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.premises_zip || '')}
              onChange={(e) => onUpdate('premises_zip', e.target.value)}
              className={inputClassFor('premises_zip')}
            />
            <FieldError message={errors.premises_zip} />
          </div>
          <div>
            <label className={labelClass}>
              Square Footage <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={String(form.premises_sf || '')}
              onChange={(e) => onUpdate('premises_sf', e.target.value)}
              placeholder="e.g. 2500"
              className={inputClassFor('premises_sf')}
            />
            <FieldError message={errors.premises_sf} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={2}
              value={String(form.premises_description || '')}
              onChange={(e) => onUpdate('premises_description', e.target.value)}
              placeholder="Describe the premises"
              className={textareaClass}
            />
          </div>
        </div>
      );

    case 'parking':
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <div>
            <label className={labelClass}>Number of Spaces</label>
            <input
              type="number"
              min="0"
              value={String(form.parking_spaces || '')}
              onChange={(e) => onUpdate('parking_spaces', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={String(form.parking_type || 'unreserved')}
              onChange={(e) => onUpdate('parking_type', e.target.value)}
              className={selectClass}
            >
              <option value="unreserved">Unreserved</option>
              <option value="reserved">Reserved</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      );

    case 'term':
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Years</label>
            <input
              type="number"
              min="0"
              value={String(form.term_years || '')}
              onChange={(e) => onUpdate('term_years', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Months</label>
            <input
              type="number"
              min="0"
              max="11"
              value={String(form.term_months || '')}
              onChange={(e) => onUpdate('term_months', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Commencement Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={String(form.commencement_date || '')}
              onChange={(e) => onUpdate('commencement_date', e.target.value)}
              className={inputClassFor('commencement_date')}
            />
            <FieldError message={errors.commencement_date} />
          </div>
          <div>
            <label className={labelClass}>
              Expiration Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={String(form.expiration_date || '')}
              onChange={(e) => onUpdate('expiration_date', e.target.value)}
              className={inputClassFor('expiration_date')}
            />
            <FieldError message={errors.expiration_date} />
          </div>
        </div>
      );

    case 'early_possession':
      return (
        <div>
          <label className={labelClass}>Early Possession Terms</label>
          <textarea
            rows={3}
            value={String(form.early_possession_terms || '')}
            onChange={(e) => onUpdate('early_possession_terms', e.target.value)}
            placeholder="Describe any early possession terms"
            className={textareaClass}
          />
        </div>
      );

    case 'base_rent':
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>
              Monthly Base Rent ($) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={String(form.base_rent_monthly || '')}
              onChange={(e) => onUpdate('base_rent_monthly', e.target.value)}
              placeholder="e.g. 3,537.30"
              className={inputClassFor('base_rent_monthly')}
            />
            <FieldError message={errors.base_rent_monthly} />
          </div>
          <div>
            <label className={labelClass}>Payable Day</label>
            <input
              type="text"
              value={String(form.base_rent_payable_day || '')}
              onChange={(e) => onUpdate('base_rent_payable_day', e.target.value)}
              placeholder="e.g. 1st"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rent Commencement Date</label>
            <input
              type="date"
              value={String(form.base_rent_commencement || '')}
              onChange={(e) => onUpdate('base_rent_commencement', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'cam':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Percentage (%)</label>
            <input
              type="text"
              value={String(form.cam_percent || '')}
              onChange={(e) => onUpdate('cam_percent', e.target.value)}
              placeholder="e.g. 100"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={2}
              value={String(form.cam_description || '')}
              onChange={(e) => onUpdate('cam_description', e.target.value)}
              placeholder="Describe CAM/operating expense structure"
              className={textareaClass}
            />
          </div>
        </div>
      );

    case 'monies':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First Month Base Rent ($)</label>
            <input
              type="text"
              value={String(form.exec_base_rent_amount || '')}
              onChange={(e) => onUpdate('exec_base_rent_amount', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>First Month CAM ($)</label>
            <input
              type="text"
              value={String(form.exec_cam_amount || '')}
              onChange={(e) => onUpdate('exec_cam_amount', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Security Deposit ($)</label>
            <input
              type="text"
              value={String(form.exec_security_deposit || '')}
              onChange={(e) => onUpdate('exec_security_deposit', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Other ($)</label>
            <input
              type="text"
              value={String(form.exec_other_amount || '')}
              onChange={(e) => onUpdate('exec_other_amount', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Other Description</label>
            <input
              type="text"
              value={String(form.exec_other_description || '')}
              onChange={(e) => onUpdate('exec_other_description', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Total Due Upon Execution ($)</label>
            <input
              type="text"
              value={String(form.total_due_upon_execution || '')}
              onChange={(e) => onUpdate('total_due_upon_execution', e.target.value)}
              className={cn(inputClass, 'font-semibold')}
            />
          </div>
        </div>
      );

    case 'agreed_use':
      return (
        <div>
          <label className={labelClass}>Permitted Use</label>
          <textarea
            rows={3}
            value={String(form.agreed_use || '')}
            onChange={(e) => onUpdate('agreed_use', e.target.value)}
            placeholder="Describe the permitted use of the premises"
            className={textareaClass}
          />
        </div>
      );

    case 'insuring':
      return (
        <div className="max-w-xs">
          <label className={labelClass}>Insuring Party</label>
          <select
            value={String(form.insuring_party || 'Lessee')}
            onChange={(e) => onUpdate('insuring_party', e.target.value)}
            className={selectClass}
          >
            <option value="Lessee">Lessee</option>
            <option value="Lessor">Lessor</option>
          </select>
        </div>
      );

    case 'brokers':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Representation Type</label>
            <select
              value={String(form.broker_representation_type || 'dual')}
              onChange={(e) => onUpdate('broker_representation_type', e.target.value)}
              className={cn(selectClass, 'max-w-xs')}
            >
              <option value="dual">Dual Agency</option>
              <option value="lessor">Lessor Only</option>
              <option value="lessee">Lessee Only</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Lessor&apos;s Broker Name</label>
            <input
              type="text"
              value={String(form.lessors_broker_name || '')}
              onChange={(e) => onUpdate('lessors_broker_name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Lessor&apos;s Broker Company</label>
            <input
              type="text"
              value={String(form.lessors_broker_company || '')}
              onChange={(e) => onUpdate('lessors_broker_company', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Lessee&apos;s Broker Name</label>
            <input
              type="text"
              value={String(form.lessees_broker_name || '')}
              onChange={(e) => onUpdate('lessees_broker_name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Lessee&apos;s Broker Company</label>
            <input
              type="text"
              value={String(form.lessees_broker_company || '')}
              onChange={(e) => onUpdate('lessees_broker_company', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Payment Terms</label>
            <input
              type="text"
              value={String(form.broker_payment_terms || '')}
              onChange={(e) => onUpdate('broker_payment_terms', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'guarantor':
      return (
        <div className="max-w-lg">
          <label className={labelClass}>Guarantor Name(s)</label>
          <input
            type="text"
            value={String(form.guarantor_names || '')}
            onChange={(e) => onUpdate('guarantor_names', e.target.value)}
            placeholder="e.g. John Smith, individually"
            className={inputClass}
          />
        </div>
      );

    case 'attachments':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <div>
              <label className={labelClass}>Addendum Start Paragraph</label>
              <input
                type="number"
                value={String(form.addendum_paragraph_start || '')}
                onChange={(e) => onUpdate('addendum_paragraph_start', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Addendum End Paragraph</label>
              <input
                type="number"
                value={String(form.addendum_paragraph_end || '')}
                onChange={(e) => onUpdate('addendum_paragraph_end', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.has_site_plan_premises)}
                onChange={(e) =>
                  onUpdate('has_site_plan_premises', e.target.checked)
                }
                className="rounded border-border"
              />
              Site Plan — Premises
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.has_site_plan_project)}
                onChange={(e) =>
                  onUpdate('has_site_plan_project', e.target.checked)
                }
                className="rounded border-border"
              />
              Site Plan — Project
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.has_rules_and_regulations)}
                onChange={(e) =>
                  onUpdate('has_rules_and_regulations', e.target.checked)
                }
                className="rounded border-border"
              />
              Rules &amp; Regulations
            </label>
          </div>
          <div>
            <label className={labelClass}>Other Attachments</label>
            <input
              type="text"
              value={String(form.other_attachments || '')}
              onChange={(e) => onUpdate('other_attachments', e.target.value)}
              placeholder="e.g. Exhibit A — Equipment Requirements"
              className={inputClass}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}
