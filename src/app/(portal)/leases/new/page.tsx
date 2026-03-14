'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { mapLoiToLease, calculateEscalationSchedule, calculateTotalConsideration } from '@/lib/lease/generate';
import type {
  LoiSection,
  LoiSectionKey,
  LoiSectionStatus,
  // Lease,
  RentEscalation,
} from '@/types/database';

// ============================================================
// Mock Data — Agreed LOIs
// ============================================================

const mockAgreedLois = [
  {
    id: 'loi-001',
    label: 'Pacific Coast Welding — Gillespie Commerce Center, Suite 104',
    sections: [
      {
        id: 'sec-001', loi_id: 'loi-001', section_key: 'base_rent' as LoiSectionKey,
        section_label: 'Base Rent', display_order: 1,
        proposed_value: 'monthly_amount: 3537.30; commencement_date: 2026-05-01; payable_day: 1st',
        landlord_response: null, agreed_value: 'monthly_amount: 3537.30; commencement_date: 2026-05-01; payable_day: 1st',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-002', loi_id: 'loi-001', section_key: 'term' as LoiSectionKey,
        section_label: 'Term', display_order: 2,
        proposed_value: 'years: 3; months: 0; commencement_date: 2026-05-01',
        landlord_response: null, agreed_value: 'years: 3; months: 0; commencement_date: 2026-05-01',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-003', loi_id: 'loi-001', section_key: 'tenant_improvements' as LoiSectionKey,
        section_label: 'Tenant Improvements', display_order: 3,
        proposed_value: 'Lessee shall have early access to the Premises beginning April 15, 2026, for the purpose of setting up equipment and fixtures only.',
        landlord_response: null, agreed_value: 'Lessee shall have early access to the Premises beginning April 15, 2026, for the purpose of setting up equipment and fixtures only. No rent shall accrue during the early possession period.',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-004', loi_id: 'loi-001', section_key: 'cam' as LoiSectionKey,
        section_label: 'CAM / Operating Expenses', display_order: 4,
        proposed_value: 'percentage: 100; description: Lessee shall pay 100% of NNN operating expenses, including real estate taxes, insurance, and CAM.',
        landlord_response: null, agreed_value: 'percentage: 100; description: Lessee shall pay 100% of NNN operating expenses, including but not limited to real estate taxes, insurance, and common area maintenance.',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-005', loi_id: 'loi-001', section_key: 'security_deposit' as LoiSectionKey,
        section_label: 'Security Deposit', display_order: 5,
        proposed_value: 'amount: 7074.60',
        landlord_response: null, agreed_value: 'amount: 7074.60',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-006', loi_id: 'loi-001', section_key: 'agreed_use' as LoiSectionKey,
        section_label: 'Agreed Use', display_order: 6,
        proposed_value: 'Metal fabrication, welding services, and related industrial activities.',
        landlord_response: null, agreed_value: 'Metal fabrication, welding services, and related industrial activities, subject to compliance with all applicable zoning, environmental, and governmental regulations.',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-007', loi_id: 'loi-001', section_key: 'parking' as LoiSectionKey,
        section_label: 'Parking', display_order: 7,
        proposed_value: 'spaces: 6; type: unreserved',
        landlord_response: null, agreed_value: 'spaces: 6; type: unreserved',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
      {
        id: 'sec-008', loi_id: 'loi-001', section_key: 'escalations' as LoiSectionKey,
        section_label: 'Rent Escalations', display_order: 8,
        proposed_value: 'annual_increase: 3; schedule: Annual on anniversary',
        landlord_response: null, agreed_value: 'annual_increase: 3; schedule: Annual on anniversary',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-01',
      },
    ] as LoiSection[],
    metadata: {
      property: {
        id: 'prop-001', name: 'Gillespie Commerce Center',
        address: '1234 Gillespie Way', city: 'El Cajon', state: 'CA', zip: '92020',
        county: 'San Diego', property_type: 'Industrial', total_sf: 25000,
        land_area_sf: null, year_built: 2005, zoning: 'M-1', parcel_number: null,
        parking_spaces: 40, parking_ratio: 1.6, power: '400 Amp 3-Phase',
        clear_height_ft: 24, dock_high_doors: 4, grade_level_doors: 6, levelers: 2,
        crane_capacity_tons: null, building_far: null, primary_leasing_company: 'Rocket Glass, Inc.',
        description: null, features: [], photos: [], floorplan_url: null,
        is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01',
      },
      unit: {
        id: 'unit-001', property_id: 'prop-001', suite_number: '104', sf: 2721,
        unit_type: 'Industrial', status: 'pending' as const, monthly_rent: null,
        rent_per_sqft: null, cam_percent: 100, cam_monthly: 680.25, base_year: null,
        current_lease_id: null, marketing_rate: 1.30, marketing_notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-01',
      },
      tenant: {
        id: 'contact-001', type: 'tenant' as const, company_name: 'Pacific Coast Welding LLC',
        dba_name: null, entity_type: 'a California limited liability company',
        first_name: 'John', last_name: 'Martinez', email: 'john@pacificcoastwelding.com',
        phone: '(619) 555-0102', address: '5678 Industrial Ave', city: 'El Cajon',
        state: 'CA', zip: '92021', industry: 'Metal Fabrication', website: null,
        notes: null, tags: [], created_at: '2025-06-01', updated_at: '2025-06-01',
      },
      landlord: {
        id: 'contact-002', type: 'landlord' as const, company_name: 'Gillespie Commerce Center LLC',
        dba_name: null, entity_type: 'a California limited liability company',
        first_name: 'John', last_name: 'Gillespie', email: 'jg@gillespiecommerce.com',
        phone: '(619) 555-0200', address: '1234 Gillespie Way', city: 'El Cajon',
        state: 'CA', zip: '92020', industry: 'Real Estate', website: null,
        notes: null, tags: [], created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      broker: {
        id: 'contact-003', type: 'broker' as const, company_name: 'Rocket Glass, Inc.',
        dba_name: null, entity_type: null,
        first_name: 'Neil', last_name: 'Bajaj', email: 'neil@rocketglass.com',
        phone: '(619) 555-0300', address: '1234 Commercial Blvd, Suite 200', city: 'San Diego',
        state: 'CA', zip: '92101', industry: 'Commercial Real Estate', website: null,
        notes: null, tags: [], created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      guarantor: {
        id: 'contact-004', type: 'guarantor' as const, company_name: null,
        dba_name: null, entity_type: null,
        first_name: 'Maria', last_name: 'Martinez', email: 'maria@pacificcoastwelding.com',
        phone: '(619) 555-0103', address: '5678 Industrial Ave', city: 'El Cajon',
        state: 'CA', zip: '92021', industry: null, website: null,
        notes: null, tags: [], created_at: '2025-06-01', updated_at: '2025-06-01',
      },
    },
  },
  {
    id: 'loi-002',
    label: 'San Diego Auto Parts — Gillespie Commerce Center, Suite 201',
    sections: [
      {
        id: 'sec-010', loi_id: 'loi-002', section_key: 'base_rent' as LoiSectionKey,
        section_label: 'Base Rent', display_order: 1,
        proposed_value: 'monthly_amount: 4500; commencement_date: 2026-07-01; payable_day: 1st',
        landlord_response: null, agreed_value: 'monthly_amount: 4500; commencement_date: 2026-07-01; payable_day: 1st',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-05',
      },
      {
        id: 'sec-011', loi_id: 'loi-002', section_key: 'term' as LoiSectionKey,
        section_label: 'Term', display_order: 2,
        proposed_value: 'years: 5; months: 0; commencement_date: 2026-07-01',
        landlord_response: null, agreed_value: 'years: 5; months: 0; commencement_date: 2026-07-01',
        status: 'accepted' as LoiSectionStatus, negotiation_notes: null, last_updated_by: null, updated_at: '2026-03-05',
      },
    ] as LoiSection[],
    metadata: {
      property: {
        id: 'prop-001', name: 'Gillespie Commerce Center',
        address: '1234 Gillespie Way', city: 'El Cajon', state: 'CA', zip: '92020',
        county: 'San Diego', property_type: 'Industrial', total_sf: 25000,
        land_area_sf: null, year_built: 2005, zoning: 'M-1', parcel_number: null,
        parking_spaces: 40, parking_ratio: 1.6, power: '400 Amp 3-Phase',
        clear_height_ft: 24, dock_high_doors: 4, grade_level_doors: 6, levelers: 2,
        crane_capacity_tons: null, building_far: null, primary_leasing_company: 'Rocket Glass, Inc.',
        description: null, features: [], photos: [], floorplan_url: null,
        is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01',
      },
      unit: {
        id: 'unit-002', property_id: 'prop-001', suite_number: '201', sf: 3500,
        unit_type: 'Industrial', status: 'pending' as const, monthly_rent: null,
        rent_per_sqft: null, cam_percent: 100, cam_monthly: 875, base_year: null,
        current_lease_id: null, marketing_rate: 1.30, marketing_notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-01',
      },
      tenant: {
        id: 'contact-005', type: 'tenant' as const, company_name: 'San Diego Auto Parts Inc.',
        dba_name: null, entity_type: 'a California corporation',
        first_name: 'Robert', last_name: 'Chen', email: 'robert@sdautoparts.com',
        phone: '(619) 555-0400', address: '9012 Auto Row', city: 'El Cajon',
        state: 'CA', zip: '92020', industry: 'Automotive Parts', website: null,
        notes: null, tags: [], created_at: '2025-08-01', updated_at: '2025-08-01',
      },
      landlord: {
        id: 'contact-002', type: 'landlord' as const, company_name: 'Gillespie Commerce Center LLC',
        dba_name: null, entity_type: 'a California limited liability company',
        first_name: 'John', last_name: 'Gillespie', email: 'jg@gillespiecommerce.com',
        phone: '(619) 555-0200', address: '1234 Gillespie Way', city: 'El Cajon',
        state: 'CA', zip: '92020', industry: 'Real Estate', website: null,
        notes: null, tags: [], created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      broker: {
        id: 'contact-003', type: 'broker' as const, company_name: 'Rocket Glass, Inc.',
        dba_name: null, entity_type: null,
        first_name: 'Neil', last_name: 'Bajaj', email: 'neil@rocketglass.com',
        phone: '(619) 555-0300', address: '1234 Commercial Blvd, Suite 200', city: 'San Diego',
        state: 'CA', zip: '92101', industry: 'Commercial Real Estate', website: null,
        notes: null, tags: [], created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    },
  },
];

// ============================================================
// Section config for manual entry / display
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
// Component
// ============================================================

export default function CreateLeasePage() {
  const [mode, setMode] = useState<'loi' | 'manual'>('loi');
  const [selectedLoiId, setSelectedLoiId] = useState('');
  const [form, setForm] = useState(getDefaultLeaseForm());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['parties', 'premises', 'base_rent', 'term']));
  const [importedSections, setImportedSections] = useState<number | null>(null);
  const [escalations, setEscalations] = useState<RentEscalation[]>([]);
  const [showEscalations, setShowEscalations] = useState(false);
  const [leaseErrors, setLeaseErrors] = useState<Record<string, string>>({});
  const [shakeKey, setShakeKey] = useState(0);

  // ---- Helpers ----

  function updateField(key: string, value: string | number | boolean | null) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error when field is edited
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
    const loi = mockAgreedLois.find((l) => l.id === selectedLoiId);
    if (!loi) return;

    const result = mapLoiToLease(loi.sections, loi.metadata);
    const lease = result.lease;

    // Populate form from lease object
    const updates: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(lease)) {
      if (key === 'status' || key === 'loi_id' || key === 'property_id' || key === 'unit_id' ||
          key === 'tenant_contact_id' || key === 'landlord_contact_id' || key === 'broker_contact_id' ||
          key === 'guarantor_contact_id' || key === 'form_type' || key === 'form_version' ||
          key === 'docusign_envelope_id' || key === 'docusign_status' || key === 'sent_for_signature_at' ||
          key === 'signed_date' || key === 'lease_pdf_url' || key === 'executed_pdf_url') {
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

    // Set escalations
    const escs = result.escalations.map((e, i) => ({
      ...e,
      id: `esc-gen-${i}`,
      lease_id: '',
    })) as RentEscalation[];
    setEscalations(escs);
    setShowEscalations(escs.length > 0);

    // Expand all sections
    setExpanded(new Set(AIR_SECTIONS.map((s) => s.key)));
  }

  // ---- Generate escalation schedule ----

  function handleGenerateEscalations() {
    const baseRent = parseFloat(String(form.base_rent_monthly)) || 0;
    const termYears = parseInt(String(form.term_years)) || 0;
    const termMonthsExtra = parseInt(String(form.term_months)) || 0;
    const totalMonths = termYears * 12 + termMonthsExtra;
    const annualIncrease = parseFloat(String(form.escalation_annual_increase)) || 3;
    const sf = parseFloat(String(form.premises_sf)) || 0;
    const commencement = String(form.commencement_date);

    if (!baseRent || !totalMonths || !commencement) return;

    const schedule = calculateEscalationSchedule(baseRent, totalMonths, annualIncrease, commencement, sf);
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
    else if (String(form.premises_state).trim().length !== 2) errors.premises_state = 'State must be a 2-character abbreviation';
    if (!String(form.premises_zip).trim()) errors.premises_zip = 'ZIP code is required';
    else if (!/^\d{5}(-\d{4})?$/.test(String(form.premises_zip).trim())) errors.premises_zip = 'Enter a valid ZIP code (e.g. 92020)';
    if (!String(form.premises_sf).trim() || parseFloat(String(form.premises_sf)) <= 0) errors.premises_sf = 'Square footage must be a positive number';
    if (!String(form.commencement_date).trim()) errors.commencement_date = 'Commencement date is required';
    if (!String(form.expiration_date).trim()) errors.expiration_date = 'Expiration date is required';

    // Cross-field: expiration > commencement
    if (String(form.commencement_date).trim() && String(form.expiration_date).trim()) {
      if (new Date(String(form.expiration_date)) <= new Date(String(form.commencement_date))) {
        errors.expiration_date = 'Expiration date must be after commencement date';
      }
    }

    if (!String(form.base_rent_monthly).trim() || parseFloat(String(form.base_rent_monthly)) <= 0) {
      errors.base_rent_monthly = 'Monthly base rent must be a positive number';
    }

    setLeaseErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShakeKey((k) => k + 1);
      // Expand sections with errors
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

  function handleSendForSignature() {
    if (!validateLease()) return;
    // In production, send to DocuSign
    alert('Lease sent for signature!');
  }

  // ---- Required fields check ----

  const _requiredFieldsFilled = useMemo(() => {
    return (
      String(form.lessor_name).trim() !== '' &&
      String(form.lessee_name).trim() !== '' &&
      String(form.premises_address).trim() !== '' &&
      parseFloat(String(form.premises_sf)) > 0 &&
      String(form.commencement_date).trim() !== '' &&
      String(form.expiration_date).trim() !== '' &&
      parseFloat(String(form.base_rent_monthly)) > 0
    );
  }, [form]);

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
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={selectedLoiId}
                  onChange={(e) => setSelectedLoiId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select an agreed LOI...</option>
                  {mockAgreedLois.map((loi) => (
                    <option key={loi.id} value={loi.id}>
                      {loi.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="primary"
                icon={Import}
                onClick={handleImportFromLoi}
                disabled={!selectedLoiId}
              >
                Import from LOI
              </Button>
            </div>
          {importedSections !== null && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                <span className="font-semibold">{importedSections} of 13</span> sections auto-populated from LOI.
                Review and edit below.
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
                    <span className="text-xs text-muted-foreground font-medium">Section {sec.number}</span>
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
                  <label className="text-xs text-muted-foreground">Annual Increase %</label>
                  <input
                    type="text"
                    value={String(form.escalation_annual_increase)}
                    onChange={(e) => updateField('escalation_annual_increase', e.target.value)}
                    className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-sm text-center outline-none focus:border-primary"
                  />
                </div>
                <Button variant="secondary" size="sm" icon={Calculator} onClick={handleGenerateEscalations}>
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
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Year</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Effective Date</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">$/SF</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Monthly Amount</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.map((esc) => (
                    <tr key={esc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium">Year {esc.year_number}</td>
                      <td className="px-5 py-3">{formatDate(esc.effective_date)}</td>
                      <td className="px-5 py-3 text-right font-mono">${esc.rent_per_sqft.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatCurrency(esc.monthly_amount)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{esc.notes || '---'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold">Total Consideration</td>
                    <td className="px-5 py-3 text-right font-bold text-primary">
                      {formatCurrency(
                        calculateTotalConsideration(
                          parseFloat(String(form.base_rent_monthly)) || 0,
                          (parseInt(String(form.term_years)) || 0) * 12 + (parseInt(String(form.term_months)) || 0),
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
          <Button variant="secondary" icon={Save}>
            Save as Draft
          </Button>
          <Button variant="secondary" icon={Eye}>
            Preview Lease
          </Button>
          <Button variant="secondary" icon={Calculator} onClick={handleGenerateEscalations}>
            Generate Escalation Schedule
          </Button>
          <Button variant="primary" icon={Send} onClick={handleSendForSignature}>
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
            <input type="date" value={String(form.reference_date || '')} onChange={(e) => onUpdate('reference_date', e.target.value)} className={inputClass} />
          </div>
          <div />
          <div>
            <label className={labelClass}>Lessor Name <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.lessor_name || '')} onChange={(e) => onUpdate('lessor_name', e.target.value)} placeholder="e.g. ABC Properties LLC" className={inputClassFor('lessor_name')} />
            <FieldError message={errors.lessor_name} />
          </div>
          <div>
            <label className={labelClass}>Lessor Entity Type</label>
            <input type="text" value={String(form.lessor_entity_type || '')} onChange={(e) => onUpdate('lessor_entity_type', e.target.value)} placeholder="e.g. a California limited liability company" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lessee Name <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.lessee_name || '')} onChange={(e) => onUpdate('lessee_name', e.target.value)} placeholder="e.g. Tenant Co. LLC" className={inputClassFor('lessee_name')} />
            <FieldError message={errors.lessee_name} />
          </div>
          <div>
            <label className={labelClass}>Lessee Entity Type</label>
            <input type="text" value={String(form.lessee_entity_type || '')} onChange={(e) => onUpdate('lessee_entity_type', e.target.value)} placeholder="e.g. a California corporation" className={inputClass} />
          </div>
        </div>
      );

    case 'premises':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.premises_address || '')} onChange={(e) => onUpdate('premises_address', e.target.value)} placeholder="e.g. 1234 Commerce Blvd, Suite 101" className={inputClassFor('premises_address')} />
            <FieldError message={errors.premises_address} />
          </div>
          <div>
            <label className={labelClass}>City <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.premises_city || '')} onChange={(e) => onUpdate('premises_city', e.target.value)} className={inputClassFor('premises_city')} />
            <FieldError message={errors.premises_city} />
          </div>
          <div>
            <label className={labelClass}>County</label>
            <input type="text" value={String(form.premises_county || '')} onChange={(e) => onUpdate('premises_county', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.premises_state || '')} onChange={(e) => onUpdate('premises_state', e.target.value)} className={inputClassFor('premises_state')} />
            <FieldError message={errors.premises_state} />
          </div>
          <div>
            <label className={labelClass}>ZIP <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.premises_zip || '')} onChange={(e) => onUpdate('premises_zip', e.target.value)} className={inputClassFor('premises_zip')} />
            <FieldError message={errors.premises_zip} />
          </div>
          <div>
            <label className={labelClass}>Square Footage <span className="text-destructive">*</span></label>
            <input type="number" value={String(form.premises_sf || '')} onChange={(e) => onUpdate('premises_sf', e.target.value)} placeholder="e.g. 2500" className={inputClassFor('premises_sf')} />
            <FieldError message={errors.premises_sf} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={String(form.premises_description || '')} onChange={(e) => onUpdate('premises_description', e.target.value)} placeholder="Describe the premises" className={textareaClass} />
          </div>
        </div>
      );

    case 'parking':
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <div>
            <label className={labelClass}>Number of Spaces</label>
            <input type="number" min="0" value={String(form.parking_spaces || '')} onChange={(e) => onUpdate('parking_spaces', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={String(form.parking_type || 'unreserved')} onChange={(e) => onUpdate('parking_type', e.target.value)} className={selectClass}>
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
            <input type="number" min="0" value={String(form.term_years || '')} onChange={(e) => onUpdate('term_years', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Months</label>
            <input type="number" min="0" max="11" value={String(form.term_months || '')} onChange={(e) => onUpdate('term_months', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Commencement Date <span className="text-destructive">*</span></label>
            <input type="date" value={String(form.commencement_date || '')} onChange={(e) => onUpdate('commencement_date', e.target.value)} className={inputClassFor('commencement_date')} />
            <FieldError message={errors.commencement_date} />
          </div>
          <div>
            <label className={labelClass}>Expiration Date <span className="text-destructive">*</span></label>
            <input type="date" value={String(form.expiration_date || '')} onChange={(e) => onUpdate('expiration_date', e.target.value)} className={inputClassFor('expiration_date')} />
            <FieldError message={errors.expiration_date} />
          </div>
        </div>
      );

    case 'early_possession':
      return (
        <div>
          <label className={labelClass}>Early Possession Terms</label>
          <textarea rows={3} value={String(form.early_possession_terms || '')} onChange={(e) => onUpdate('early_possession_terms', e.target.value)} placeholder="Describe any early possession terms" className={textareaClass} />
        </div>
      );

    case 'base_rent':
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Monthly Base Rent ($) <span className="text-destructive">*</span></label>
            <input type="text" value={String(form.base_rent_monthly || '')} onChange={(e) => onUpdate('base_rent_monthly', e.target.value)} placeholder="e.g. 3,537.30" className={inputClassFor('base_rent_monthly')} />
            <FieldError message={errors.base_rent_monthly} />
          </div>
          <div>
            <label className={labelClass}>Payable Day</label>
            <input type="text" value={String(form.base_rent_payable_day || '')} onChange={(e) => onUpdate('base_rent_payable_day', e.target.value)} placeholder="e.g. 1st" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rent Commencement Date</label>
            <input type="date" value={String(form.base_rent_commencement || '')} onChange={(e) => onUpdate('base_rent_commencement', e.target.value)} className={inputClass} />
          </div>
        </div>
      );

    case 'cam':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Percentage (%)</label>
            <input type="text" value={String(form.cam_percent || '')} onChange={(e) => onUpdate('cam_percent', e.target.value)} placeholder="e.g. 100" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={String(form.cam_description || '')} onChange={(e) => onUpdate('cam_description', e.target.value)} placeholder="Describe CAM/operating expense structure" className={textareaClass} />
          </div>
        </div>
      );

    case 'monies':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First Month Base Rent ($)</label>
            <input type="text" value={String(form.exec_base_rent_amount || '')} onChange={(e) => onUpdate('exec_base_rent_amount', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>First Month CAM ($)</label>
            <input type="text" value={String(form.exec_cam_amount || '')} onChange={(e) => onUpdate('exec_cam_amount', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Security Deposit ($)</label>
            <input type="text" value={String(form.exec_security_deposit || '')} onChange={(e) => onUpdate('exec_security_deposit', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Other ($)</label>
            <input type="text" value={String(form.exec_other_amount || '')} onChange={(e) => onUpdate('exec_other_amount', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Other Description</label>
            <input type="text" value={String(form.exec_other_description || '')} onChange={(e) => onUpdate('exec_other_description', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total Due Upon Execution ($)</label>
            <input type="text" value={String(form.total_due_upon_execution || '')} onChange={(e) => onUpdate('total_due_upon_execution', e.target.value)} className={cn(inputClass, 'font-semibold')} />
          </div>
        </div>
      );

    case 'agreed_use':
      return (
        <div>
          <label className={labelClass}>Permitted Use</label>
          <textarea rows={3} value={String(form.agreed_use || '')} onChange={(e) => onUpdate('agreed_use', e.target.value)} placeholder="Describe the permitted use of the premises" className={textareaClass} />
        </div>
      );

    case 'insuring':
      return (
        <div className="max-w-xs">
          <label className={labelClass}>Insuring Party</label>
          <select value={String(form.insuring_party || 'Lessee')} onChange={(e) => onUpdate('insuring_party', e.target.value)} className={selectClass}>
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
            <select value={String(form.broker_representation_type || 'dual')} onChange={(e) => onUpdate('broker_representation_type', e.target.value)} className={cn(selectClass, 'max-w-xs')}>
              <option value="dual">Dual Agency</option>
              <option value="lessor">Lessor Only</option>
              <option value="lessee">Lessee Only</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Lessor&apos;s Broker Name</label>
            <input type="text" value={String(form.lessors_broker_name || '')} onChange={(e) => onUpdate('lessors_broker_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lessor&apos;s Broker Company</label>
            <input type="text" value={String(form.lessors_broker_company || '')} onChange={(e) => onUpdate('lessors_broker_company', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lessee&apos;s Broker Name</label>
            <input type="text" value={String(form.lessees_broker_name || '')} onChange={(e) => onUpdate('lessees_broker_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lessee&apos;s Broker Company</label>
            <input type="text" value={String(form.lessees_broker_company || '')} onChange={(e) => onUpdate('lessees_broker_company', e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Payment Terms</label>
            <input type="text" value={String(form.broker_payment_terms || '')} onChange={(e) => onUpdate('broker_payment_terms', e.target.value)} className={inputClass} />
          </div>
        </div>
      );

    case 'guarantor':
      return (
        <div className="max-w-lg">
          <label className={labelClass}>Guarantor Name(s)</label>
          <input type="text" value={String(form.guarantor_names || '')} onChange={(e) => onUpdate('guarantor_names', e.target.value)} placeholder="e.g. John Smith, individually" className={inputClass} />
        </div>
      );

    case 'attachments':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <div>
              <label className={labelClass}>Addendum Start Paragraph</label>
              <input type="number" value={String(form.addendum_paragraph_start || '')} onChange={(e) => onUpdate('addendum_paragraph_start', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Addendum End Paragraph</label>
              <input type="number" value={String(form.addendum_paragraph_end || '')} onChange={(e) => onUpdate('addendum_paragraph_end', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.has_site_plan_premises)} onChange={(e) => onUpdate('has_site_plan_premises', e.target.checked)} className="rounded border-border" />
              Site Plan — Premises
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.has_site_plan_project)} onChange={(e) => onUpdate('has_site_plan_project', e.target.checked)} className="rounded border-border" />
              Site Plan — Project
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.has_rules_and_regulations)} onChange={(e) => onUpdate('has_rules_and_regulations', e.target.checked)} className="rounded border-border" />
              Rules &amp; Regulations
            </label>
          </div>
          <div>
            <label className={labelClass}>Other Attachments</label>
            <input type="text" value={String(form.other_attachments || '')} onChange={(e) => onUpdate('other_attachments', e.target.value)} placeholder="e.g. Exhibit A — Equipment Requirements" className={inputClass} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
