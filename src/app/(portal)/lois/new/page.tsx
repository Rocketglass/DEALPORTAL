'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DollarSign,
  Calendar,
  Paintbrush,
  BarChart3,
  Shield,
  FileCheck,
  Car,
  RefreshCw,
  TrendingUp,
  Gift,
  ChevronDown,
  ChevronUp,
  Send,
  Save,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  Store,
  Briefcase,
  Zap,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/back-button';
import type { Contact, Property, Unit, LoiSectionKey } from '@/types/database';

// ---------------------------------------------------------------------------
// LOI Template types
// ---------------------------------------------------------------------------

interface LoiTemplateSection {
  section_key: string;
  section_label: string;
  display_order: number;
  default_value: string;
}

interface LoiTemplate {
  id: string;
  name: string;
  property_type: string;
  description: string | null;
  sections: LoiTemplateSection[];
  is_default: boolean;
}

const PROPERTY_TYPE_ICONS: Record<string, React.ElementType> = {
  industrial: Building2,
  retail: Store,
  office: Briefcase,
  flex: Zap,
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  industrial: 'Industrial',
  retail: 'Retail',
  office: 'Office',
  flex: 'Flex',
};

// ---------------------------------------------------------------------------
// Section configuration
// ---------------------------------------------------------------------------

interface SectionConfig {
  key: LoiSectionKey;
  label: string;
  icon: React.ElementType;
  required?: boolean;
}

const SECTIONS: SectionConfig[] = [
  { key: 'base_rent', label: 'Base Rent', icon: DollarSign, required: true },
  { key: 'term', label: 'Term', icon: Calendar, required: true },
  { key: 'tenant_improvements', label: 'Tenant Improvements', icon: Paintbrush },
  { key: 'cam', label: 'CAM / Operating Expenses', icon: BarChart3 },
  { key: 'security_deposit', label: 'Security Deposit', icon: Shield },
  { key: 'agreed_use', label: 'Agreed Use', icon: FileCheck },
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'options', label: 'Options', icon: RefreshCw },
  { key: 'escalations', label: 'Rent Escalations', icon: TrendingUp },
  { key: 'free_rent', label: 'Free Rent', icon: Gift },
];

// SECTION_LABELS maps a key to its human-readable label for loi_sections.section_label
const SECTION_LABELS: Record<LoiSectionKey, string> = {
  base_rent: 'Base Rent',
  term: 'Term',
  tenant_improvements: 'Tenant Improvements',
  cam: 'CAM / Operating Expenses',
  security_deposit: 'Security Deposit',
  agreed_use: 'Agreed Use',
  parking: 'Parking',
  options: 'Options',
  escalations: 'Rent Escalations',
  free_rent: 'Free Rent',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Section data shapes
// ---------------------------------------------------------------------------

interface SectionData {
  base_rent: { monthlyAmount: string; perSfRate: string; commencementDate: string };
  term: { years: string; months: string; commencementDate: string; expirationDate: string };
  tenant_improvements: { amount: string; description: string; whoPays: string };
  cam: { percentage: string; structure: string; baseYear: string };
  security_deposit: { amount: string };
  agreed_use: { description: string };
  parking: { spaces: string; type: string };
  options: { renewalOptions: string; expansionOptions: string; rofr: string };
  escalations: { annualIncrease: string; schedule: string };
  free_rent: { months: string; conditions: string };
}

const INITIAL_DATA: SectionData = {
  base_rent: { monthlyAmount: '', perSfRate: '', commencementDate: '' },
  term: { years: '', months: '', commencementDate: '', expirationDate: '' },
  tenant_improvements: { amount: '', description: '', whoPays: 'landlord' },
  cam: { percentage: '', structure: 'nnn', baseYear: '' },
  security_deposit: { amount: '' },
  agreed_use: { description: '' },
  parking: { spaces: '', type: 'unreserved' },
  options: { renewalOptions: '', expansionOptions: '', rofr: '' },
  escalations: { annualIncrease: '', schedule: '' },
  free_rent: { months: '', conditions: '' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFilled(key: LoiSectionKey, data: SectionData): boolean {
  const d = data[key as keyof SectionData];
  return Object.values(d).some((v) => typeof v === 'string' && v.trim() !== '');
}

/** Serialize a section's data object into the `proposed_value` string format */
function serializeSection(key: LoiSectionKey, data: SectionData): string {
  const d = data[key as keyof SectionData];
  return Object.entries(d)
    .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function contactLabel(c: Contact): string {
  if (c.company_name) return c.company_name;
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.id;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateLoiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ----- Dropdown data -----
  const [properties, setProperties] = useState<(Property & { units: Unit[] })[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ----- Template state -----
  const [templates, setTemplates] = useState<LoiTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);

  // ----- Form state -----
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantContactId, setTenantContactId] = useState('');
  const [landlordContactId, setLandlordContactId] = useState('');
  const [brokerContactId, setBrokerContactId] = useState('');

  const [sections, setSections] = useState<SectionData>(INITIAL_DATA);
  const [expanded, setExpanded] = useState<Set<LoiSectionKey>>(new Set(['base_rent', 'term']));
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [sectionErrors, setSectionErrors] = useState<Set<LoiSectionKey>>(new Set());
  const [, setHasAttemptedSend] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // ----- Submission state -----
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----- Load dropdown data and templates on mount -----
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      setDataError(null);
      try {
        const res = await fetch('/api/lois/dropdown-data');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load form data');
        setProperties(data.properties ?? []);
        setContacts(data.contacts ?? []);
      } catch (err) {
        setDataError((err as Error).message);
      } finally {
        setLoadingData(false);
      }
    }
    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch('/api/loi-templates');
        const data = await res.json();
        if (res.ok) {
          setTemplates(data.templates ?? []);
        }
      } catch {
        // Templates are optional — don't block the form
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadData();
    loadTemplates();
  }, []);

  // ----- Auto-fill from application query param -----
  const applicationParamHandled = useRef(false);

  useEffect(() => {
    const applicationId = searchParams.get('application');
    if (!applicationId || applicationParamHandled.current) return;
    if (loadingData || properties.length === 0 || contacts.length === 0) return;

    applicationParamHandled.current = true;

    // Fetch the application data and pre-fill the form
    async function prefillFromApplication(appId: string) {
      try {
        const res = await fetch(`/api/lois/dropdown-data/application?id=${appId}`);
        if (!res.ok) {
          // Fallback: try fetching from the applications list endpoint filtered by id
          // If there's no dedicated endpoint, we can fetch the application data via
          // the existing getApplication server query pattern using a lightweight API.
          console.warn('[LOI new] Could not fetch application data for prefill');
          return;
        }
        const app = await res.json();

        // Auto-select property
        if (app.property_id) {
          const matchedProp = properties.find((p) => p.id === app.property_id);
          if (matchedProp) {
            setPropertyId(app.property_id);
            // Auto-select unit
            if (app.unit_id) {
              const matchedUnit = matchedProp.units?.find((u: Unit) => u.id === app.unit_id);
              if (matchedUnit) {
                setUnitId(app.unit_id);
              }
            }
          }
        }

        // Auto-select tenant contact
        if (app.contact_id) {
          const matchedContact = contacts.find((c) => c.id === app.contact_id);
          if (matchedContact) {
            setTenantContactId(app.contact_id);
          }
        }

        // Pre-fill sections from application data
        const newSections = { ...INITIAL_DATA };
        if (app.agreed_use) {
          newSections.agreed_use = { description: app.agreed_use };
        }
        if (app.desired_term_months) {
          const years = Math.floor(app.desired_term_months / 12);
          const months = app.desired_term_months % 12;
          newSections.term = {
            ...INITIAL_DATA.term,
            years: years > 0 ? years.toString() : '',
            months: months > 0 ? months.toString() : '',
          };
        }
        if (app.desired_rent_budget) {
          newSections.base_rent = {
            ...INITIAL_DATA.base_rent,
            monthlyAmount: app.desired_rent_budget.toString(),
          };
        }
        setSections(newSections);

        // Expand sections that have been filled
        const expandedKeys = new Set<LoiSectionKey>(['base_rent', 'term']);
        if (app.agreed_use) expandedKeys.add('agreed_use');
        setExpanded(expandedKeys);
      } catch (err) {
        console.warn('[LOI new] Error prefilling from application:', err);
      }
    }

    prefillFromApplication(applicationId);
  }, [searchParams, loadingData, properties, contacts]);

  // Selected property and its type (for template auto-suggestion)
  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Available units filtered by selected property
  const availableUnits = selectedProperty?.units ?? [];

  // Templates filtered by selected property type (if a property is selected)
  const selectedPropertyType = selectedProperty?.property_type?.toLowerCase() ?? '';
  const suggestedTemplates = selectedPropertyType
    ? templates.filter((t) => t.property_type === selectedPropertyType)
    : templates;

  // Apply a template's default values to the section form fields
  const applyTemplate = useCallback((template: LoiTemplate | null) => {
    if (!template) {
      // "Blank LOI" — reset to initial data
      setSections(INITIAL_DATA);
      setSelectedTemplateId(null);
      setTemplateApplied(false);
      setExpanded(new Set(['base_rent', 'term']));
      return;
    }

    setSelectedTemplateId(template.id);
    setTemplateApplied(true);

    // Build a map of section_key → default_value from the template
    const defaults = new Map<string, string>();
    for (const sec of template.sections) {
      defaults.set(sec.section_key, sec.default_value);
    }

    // Pre-populate sections — we put the template default_value into the
    // primary text field of each section so the broker can see and edit it.
    // For structured sections (like base_rent with multiple fields), we place
    // the template text into the most descriptive field.
    const newSections: SectionData = { ...INITIAL_DATA };

    if (defaults.has('base_rent')) {
      newSections.base_rent = { ...INITIAL_DATA.base_rent, perSfRate: defaults.get('base_rent')! };
    }
    if (defaults.has('term')) {
      // Parse months from template if it's a simple "X months" pattern
      const termVal = defaults.get('term')!;
      const monthMatch = termVal.match(/^(\d+)\s*months?$/i);
      if (monthMatch) {
        const totalMonths = parseInt(monthMatch[1], 10);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        newSections.term = { ...INITIAL_DATA.term, years: years.toString(), months: months.toString() };
      } else {
        newSections.term = { ...INITIAL_DATA.term, years: termVal, months: '' };
      }
    }
    if (defaults.has('tenant_improvements')) {
      newSections.tenant_improvements = { ...INITIAL_DATA.tenant_improvements, description: defaults.get('tenant_improvements')! };
    }
    if (defaults.has('cam')) {
      const camVal = defaults.get('cam')!;
      const camLower = camVal.toLowerCase();
      let structure = 'nnn';
      if (camLower.includes('full service')) structure = 'full_service';
      else if (camLower.includes('modified')) structure = 'modified_gross';
      newSections.cam = { ...INITIAL_DATA.cam, structure, percentage: camVal };
    }
    if (defaults.has('security_deposit')) {
      newSections.security_deposit = { amount: defaults.get('security_deposit')! };
    }
    if (defaults.has('agreed_use')) {
      newSections.agreed_use = { description: defaults.get('agreed_use')! };
    }
    if (defaults.has('parking')) {
      newSections.parking = { ...INITIAL_DATA.parking, spaces: defaults.get('parking')! };
    }
    if (defaults.has('options')) {
      newSections.options = { ...INITIAL_DATA.options, renewalOptions: defaults.get('options')! };
    }
    if (defaults.has('escalations')) {
      const escVal = defaults.get('escalations')!;
      const pctMatch = escVal.match(/(\d+)%/);
      newSections.escalations = {
        annualIncrease: pctMatch ? pctMatch[1] : '',
        schedule: escVal,
      };
    }
    if (defaults.has('free_rent')) {
      const frVal = defaults.get('free_rent')!;
      const isNone = frVal.toLowerCase() === 'none';
      newSections.free_rent = {
        months: isNone ? '0' : '',
        conditions: isNone ? '' : frVal,
      };
    }

    setSections(newSections);

    // Expand all sections that have values from the template
    const expandedKeys = new Set<LoiSectionKey>(['base_rent', 'term']);
    for (const sec of template.sections) {
      expandedKeys.add(sec.section_key as LoiSectionKey);
    }
    setExpanded(expandedKeys);
  }, []);

  // Filtered contact lists by role
  const tenantContacts = contacts.filter((c) =>
    c.type === 'tenant' || c.type === 'prospect',
  );
  const landlordContacts = contacts.filter((c) => c.type === 'landlord');
  const brokerContacts = contacts.filter((c) => c.type === 'broker');

  // ----- Section helpers -----

  function toggle(key: LoiSectionKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateSection<K extends keyof SectionData>(
    key: K,
    field: keyof SectionData[K],
    value: string,
  ) {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setSectionErrors((prev) => {
      const next = new Set(prev);
      next.delete(key as LoiSectionKey);
      return next;
    });
  }

  function clearHeaderError(field: string) {
    setHeaderErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // ----- Validation -----

  function validate(): boolean {
    setHasAttemptedSend(true);
    const newHeaderErrors: Record<string, string> = {};
    const newSectionErrors = new Set<LoiSectionKey>();

    if (!propertyId) newHeaderErrors.propertyId = 'Property is required';
    if (!unitId) newHeaderErrors.unitId = 'Suite / unit is required';
    if (!tenantContactId) newHeaderErrors.tenantContactId = 'Tenant is required';
    if (!landlordContactId) newHeaderErrors.landlordContactId = 'Landlord is required';
    if (!brokerContactId) newHeaderErrors.brokerContactId = 'Broker is required';

    if (!isFilled('base_rent', sections)) newSectionErrors.add('base_rent');
    if (!isFilled('term', sections)) newSectionErrors.add('term');

    setHeaderErrors(newHeaderErrors);
    setSectionErrors(newSectionErrors);

    const hasErrors =
      Object.keys(newHeaderErrors).length > 0 || newSectionErrors.size > 0;
    if (hasErrors) {
      setShakeKey((k) => k + 1);
      setExpanded((prev) => {
        const next = new Set(prev);
        newSectionErrors.forEach((k) => next.add(k));
        return next;
      });
    }
    return !hasErrors;
  }

  // ----- Build sections payload -----

  function buildSectionsPayload() {
    return SECTIONS.filter((sec) => isFilled(sec.key, sections)).map(
      (sec, idx) => ({
        section_key: sec.key,
        section_label: SECTION_LABELS[sec.key],
        display_order: idx + 1,
        proposed_value: serializeSection(sec.key, sections),
        status: 'proposed' as const,
      }),
    );
  }

  // ----- Submit -----

  async function submit(status: 'draft' | 'sent') {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/lois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          unit_id: unitId,
          tenant_contact_id: tenantContactId,
          landlord_contact_id: landlordContactId,
          broker_contact_id: brokerContactId,
          status,
          sections: buildSectionsPayload(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to create LOI');
      }

      router.push(`/lois/${json.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <BackButton href="/lois" label="Back to LOIs" className="mb-4" />

      <h1 className="text-2xl font-bold">Create Letter of Intent</h1>
      <p className="mt-1 text-muted-foreground">
        Fill in the deal terms below. Expand each section to enter details.
      </p>

      {/* Data load error */}
      {dataError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load form data: {dataError}</span>
        </div>
      )}

      {/* Submission error */}
      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Template picker                                                     */}
      {/* ------------------------------------------------------------------ */}
      {!loadingTemplates && templates.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Start from a template</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedPropertyType
                  ? `Showing templates for ${PROPERTY_TYPE_LABELS[selectedPropertyType] ?? selectedPropertyType} properties. `
                  : 'Select a property to see suggested templates, or choose any below. '}
                Templates pre-fill standard lease terms you can customize.
              </p>
            </div>
            {templateApplied && (
              <button
                type="button"
                onClick={() => applyTemplate(null)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear template
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Blank LOI option */}
            <button
              type="button"
              onClick={() => applyTemplate(null)}
              className={cn(
                'group relative flex flex-col items-start rounded-xl border bg-white px-4 py-3.5 text-left transition-all hover:shadow-sm',
                !selectedTemplateId && !templateApplied
                  ? 'border-primary/40 ring-1 ring-primary/20'
                  : 'border-border hover:border-slate-300',
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    !selectedTemplateId && !templateApplied
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-muted-foreground group-hover:bg-gray-200',
                  )}
                >
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">Blank LOI</span>
                  <p className="text-[11px] leading-tight text-muted-foreground">Start from scratch</p>
                </div>
              </div>
            </button>

            {/* Template cards — show suggested first, then others */}
            {(selectedPropertyType ? [...suggestedTemplates, ...templates.filter((t) => t.property_type !== selectedPropertyType)] : templates).map((template) => {
              const Icon = PROPERTY_TYPE_ICONS[template.property_type] ?? FileText;
              const isSelected = selectedTemplateId === template.id;
              const isSuggested = selectedPropertyType && template.property_type === selectedPropertyType;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    'group relative flex flex-col items-start rounded-xl border bg-white px-4 py-3.5 text-left transition-all hover:shadow-sm',
                    isSelected
                      ? 'border-primary/40 ring-1 ring-primary/20'
                      : 'border-border hover:border-slate-300',
                    isSuggested && !isSelected && 'border-primary/20',
                  )}
                >
                  {isSuggested && (
                    <span className="absolute -top-2 right-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Suggested
                    </span>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-muted-foreground group-hover:bg-gray-200',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {template.name}
                      </span>
                      <p className="truncate text-[11px] leading-tight text-muted-foreground">
                        {template.description ?? PROPERTY_TYPE_LABELS[template.property_type] ?? template.property_type}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Header fields                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Property */}
        <div>
          <Select
            label="Property"
            required
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId('');
              clearHeaderError('propertyId');
            }}
            error={headerErrors.propertyId}
            disabled={loadingData}
          >
            <option value="">
              {loadingData ? 'Loading…' : 'Select a property'}
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Unit / Suite */}
        <div>
          <Select
            label="Suite"
            required
            value={unitId}
            onChange={(e) => {
              setUnitId(e.target.value);
              clearHeaderError('unitId');
            }}
            error={headerErrors.unitId}
            disabled={!propertyId || loadingData}
          >
            <option value="">
              {!propertyId ? 'Select a property first' : 'Select a suite'}
            </option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>
                Suite {u.suite_number}
                {u.sf ? ` — ${u.sf.toLocaleString()} SF` : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* Tenant */}
        <div>
          <Select
            label="Tenant"
            required
            value={tenantContactId}
            onChange={(e) => {
              setTenantContactId(e.target.value);
              clearHeaderError('tenantContactId');
            }}
            error={headerErrors.tenantContactId}
            disabled={loadingData}
          >
            <option value="">
              {loadingData ? 'Loading…' : 'Select a tenant'}
            </option>
            {tenantContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactLabel(c)}
              </option>
            ))}
          </Select>
        </div>

        {/* Landlord */}
        <div>
          <Select
            label="Landlord"
            required
            value={landlordContactId}
            onChange={(e) => {
              setLandlordContactId(e.target.value);
              clearHeaderError('landlordContactId');
            }}
            error={headerErrors.landlordContactId}
            disabled={loadingData}
          >
            <option value="">
              {loadingData ? 'Loading…' : 'Select a landlord'}
            </option>
            {landlordContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactLabel(c)}
              </option>
            ))}
          </Select>
        </div>

        {/* Broker */}
        <div>
          <Select
            label="Broker"
            required
            value={brokerContactId}
            onChange={(e) => {
              setBrokerContactId(e.target.value);
              clearHeaderError('brokerContactId');
            }}
            error={headerErrors.brokerContactId}
            disabled={loadingData}
          >
            <option value="">
              {loadingData ? 'Loading…' : 'Select a broker'}
            </option>
            {brokerContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactLabel(c)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div key={shakeKey} className={cn('mt-8 space-y-3', shakeKey > 0 && 'animate-shake')}>
        {SECTIONS.map((sec) => {
          const isExpanded = expanded.has(sec.key);
          const filled = isFilled(sec.key, sections);
          const hasError = sectionErrors.has(sec.key);

          return (
            <div
              key={sec.key}
              className={cn(
                'rounded-xl bg-white shadow-sm transition-colors',
                hasError ? 'ring-1 ring-red-500' : filled ? 'ring-1 ring-primary/40' : '',
              )}
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => toggle(sec.key)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <sec.icon
                    className={cn(
                      'h-5 w-5',
                      hasError
                        ? 'text-red-500'
                        : filled
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-sm font-semibold">{sec.label}</span>
                  {sec.required && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        hasError
                          ? 'bg-red-50 text-red-600'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      Required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasError && (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Incomplete
                    </span>
                  )}
                  {filled && !hasError && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Filled
                    </span>
                  )}
                  {!filled && !isExpanded && !hasError && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Draft
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Card body */}
              {isExpanded && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <SectionFields
                    sectionKey={sec.key}
                    data={sections}
                    onChange={updateSection}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom action bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 flex items-center justify-end gap-3 rounded-xl bg-white px-5 py-4 shadow-sm">
        <Button
          variant="secondary"
          icon={submitting ? Loader2 : Save}
          onClick={() => submit('draft')}
          disabled={submitting || loadingData}
        >
          Save as Draft
        </Button>
<Button
          variant="primary"
          icon={submitting ? Loader2 : Send}
          onClick={() => submit('sent')}
          disabled={submitting || loadingData}
        >
          Send to Landlord
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section field renderers
// ---------------------------------------------------------------------------

function SectionFields({
  sectionKey,
  data,
  onChange,
}: {
  sectionKey: LoiSectionKey;
  data: SectionData;
  onChange: <K extends keyof SectionData>(
    key: K,
    field: keyof SectionData[K],
    value: string,
  ) => void;
}) {
  switch (sectionKey) {
    case 'base_rent': {
      const d = data.base_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Monthly Amount ($)"
            type="text"
            value={d.monthlyAmount}
            onChange={(e) => onChange('base_rent', 'monthlyAmount', e.target.value)}
            placeholder="e.g. 5,000"
          />
          <Input
            label="Per SF Rate ($)"
            type="text"
            value={d.perSfRate}
            onChange={(e) => onChange('base_rent', 'perSfRate', e.target.value)}
            placeholder="e.g. 1.25"
          />
          <Input
            label="Rent Commencement Date"
            type="date"
            value={d.commencementDate}
            onChange={(e) => onChange('base_rent', 'commencementDate', e.target.value)}
          />
        </div>
      );
    }

    case 'term': {
      const d = data.term;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Years"
            type="number"
            min={0}
            value={d.years}
            onChange={(e) => onChange('term', 'years', e.target.value)}
            placeholder="e.g. 5"
          />
          <Input
            label="Months"
            type="number"
            min={0}
            max={11}
            value={d.months}
            onChange={(e) => onChange('term', 'months', e.target.value)}
            placeholder="e.g. 0"
          />
          <Input
            label="Commencement Date"
            type="date"
            value={d.commencementDate}
            onChange={(e) => onChange('term', 'commencementDate', e.target.value)}
          />
          <Input
            label="Expiration Date"
            type="date"
            value={d.expirationDate}
            onChange={(e) => onChange('term', 'expirationDate', e.target.value)}
          />
        </div>
      );
    }

    case 'tenant_improvements': {
      const d = data.tenant_improvements;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Dollar Amount ($)"
            type="text"
            value={d.amount}
            onChange={(e) => onChange('tenant_improvements', 'amount', e.target.value)}
            placeholder="e.g. 25,000"
          />
          <Input
            label="Description"
            type="text"
            value={d.description}
            onChange={(e) =>
              onChange('tenant_improvements', 'description', e.target.value)
            }
            placeholder="Describe improvements"
          />
          <Select
            label="Who Pays"
            value={d.whoPays}
            onChange={(e) => onChange('tenant_improvements', 'whoPays', e.target.value)}
          >
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="shared">Shared</option>
          </Select>
        </div>
      );
    }

    case 'cam': {
      const d = data.cam;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Percentage (%)"
            type="text"
            value={d.percentage}
            onChange={(e) => onChange('cam', 'percentage', e.target.value)}
            placeholder="e.g. 15"
          />
          <Select
            label="Structure"
            value={d.structure}
            onChange={(e) => onChange('cam', 'structure', e.target.value)}
          >
            <option value="nnn">NNN (Triple Net)</option>
            <option value="modified_gross">Modified Gross</option>
            <option value="full_service">Full Service</option>
          </Select>
          <Input
            label="Base Year"
            type="text"
            value={d.baseYear}
            onChange={(e) => onChange('cam', 'baseYear', e.target.value)}
            placeholder="e.g. 2026"
          />
        </div>
      );
    }

    case 'security_deposit': {
      const d = data.security_deposit;
      return (
        <div className="max-w-xs">
          <Input
            label="Amount ($)"
            type="text"
            value={d.amount}
            onChange={(e) => onChange('security_deposit', 'amount', e.target.value)}
            placeholder="e.g. 10,000"
          />
        </div>
      );
    }

    case 'agreed_use': {
      const d = data.agreed_use;
      return (
        <Textarea
          label="Permitted Use"
          rows={3}
          value={d.description}
          onChange={(e) => onChange('agreed_use', 'description', e.target.value)}
          placeholder="Describe the permitted use of the premises"
        />
      );
    }

    case 'parking': {
      const d = data.parking;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input
            label="Number of Spaces"
            type="number"
            min={0}
            value={d.spaces}
            onChange={(e) => onChange('parking', 'spaces', e.target.value)}
            placeholder="e.g. 10"
          />
          <Select
            label="Type"
            value={d.type}
            onChange={(e) => onChange('parking', 'type', e.target.value)}
          >
            <option value="unreserved">Unreserved</option>
            <option value="reserved">Reserved</option>
            <option value="mixed">Mixed</option>
          </Select>
        </div>
      );
    }

    case 'options': {
      const d = data.options;
      return (
        <div className="space-y-4">
          <Textarea
            label="Renewal Options"
            rows={2}
            value={d.renewalOptions}
            onChange={(e) => onChange('options', 'renewalOptions', e.target.value)}
            placeholder="e.g. Two (2) five-year renewal options at fair market value"
          />
          <Textarea
            label="Expansion Options"
            rows={2}
            value={d.expansionOptions}
            onChange={(e) => onChange('options', 'expansionOptions', e.target.value)}
            placeholder="e.g. Right to expand into adjacent Suite 102"
          />
          <Textarea
            label="Right of First Refusal"
            rows={2}
            value={d.rofr}
            onChange={(e) => onChange('options', 'rofr', e.target.value)}
            placeholder="e.g. ROFR on any adjacent space that becomes available"
          />
        </div>
      );
    }

    case 'escalations': {
      const d = data.escalations;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input
            label="Annual Increase (%)"
            type="text"
            value={d.annualIncrease}
            onChange={(e) => onChange('escalations', 'annualIncrease', e.target.value)}
            placeholder="e.g. 3"
          />
          <Input
            label="Schedule / Notes"
            type="text"
            value={d.schedule}
            onChange={(e) => onChange('escalations', 'schedule', e.target.value)}
            placeholder="e.g. Annual on anniversary"
          />
        </div>
      );
    }

    case 'free_rent': {
      const d = data.free_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input
            label="Number of Months"
            type="number"
            min={0}
            value={d.months}
            onChange={(e) => onChange('free_rent', 'months', e.target.value)}
            placeholder="e.g. 2"
          />
          <Input
            label="Conditions"
            type="text"
            value={d.conditions}
            onChange={(e) => onChange('free_rent', 'conditions', e.target.value)}
            placeholder="e.g. First 2 months of term"
          />
        </div>
      );
    }

    default:
      return null;
  }
}
