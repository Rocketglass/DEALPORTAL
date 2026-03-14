'use client';

import { useState } from 'react';
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
  Eye,
  Save,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/back-button';
import type { LoiSectionKey } from '@/types/database';

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

function requiredSectionsFilled(data: SectionData): boolean {
  return (
    isFilled('base_rent', data) && isFilled('term', data)
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateLoiPage() {
  const [property, setProperty] = useState('');
  const [suite, setSuite] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [sections, setSections] = useState<SectionData>(INITIAL_DATA);
  const [expanded, setExpanded] = useState<Set<LoiSectionKey>>(new Set(['base_rent', 'term']));
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [sectionErrors, setSectionErrors] = useState<Set<LoiSectionKey>>(new Set());
  const [hasAttemptedSend, setHasAttemptedSend] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

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
    // Clear section error when user edits
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

  function validateAndSend() {
    setHasAttemptedSend(true);
    const newHeaderErrors: Record<string, string> = {};
    const newSectionErrors = new Set<LoiSectionKey>();

    // Header validation
    if (!property.trim()) newHeaderErrors.property = 'Property name is required';
    if (!suite.trim()) newHeaderErrors.suite = 'Suite is required';
    if (!tenantName.trim()) newHeaderErrors.tenantName = 'Tenant name is required';
    if (!landlordName.trim()) newHeaderErrors.landlordName = 'Landlord name is required';
    if (!brokerName.trim()) newHeaderErrors.brokerName = 'Broker name is required';

    // Required sections
    if (!isFilled('base_rent', sections)) newSectionErrors.add('base_rent');
    if (!isFilled('term', sections)) newSectionErrors.add('term');

    setHeaderErrors(newHeaderErrors);
    setSectionErrors(newSectionErrors);

    const hasErrors = Object.keys(newHeaderErrors).length > 0 || newSectionErrors.size > 0;
    if (hasErrors) {
      setShakeKey((k) => k + 1);
      // Auto-expand errored sections
      setExpanded((prev) => {
        const next = new Set(prev);
        newSectionErrors.forEach((k) => next.add(k));
        return next;
      });
      return;
    }

    // In production, submit to API
    alert('LOI sent to landlord successfully!');
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <BackButton href="/lois" label="Back to LOIs" className="mb-4" />

      <h1 className="text-2xl font-bold">Create Letter of Intent</h1>
      <p className="mt-1 text-muted-foreground">
        Fill in the deal terms below. Expand each section to enter details.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Header fields                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Property"
          required
          value={property}
          onChange={(e) => { setProperty(e.target.value); clearHeaderError('property'); }}
          placeholder="Search or enter property name"
          error={headerErrors.property}
        />
        <Input
          label="Suite"
          required
          value={suite}
          onChange={(e) => { setSuite(e.target.value); clearHeaderError('suite'); }}
          placeholder="e.g. 101"
          error={headerErrors.suite}
        />
        <Input
          label="Tenant Name"
          required
          value={tenantName}
          onChange={(e) => { setTenantName(e.target.value); clearHeaderError('tenantName'); }}
          placeholder="Company or individual"
          error={headerErrors.tenantName}
        />
        <Input
          label="Landlord Name"
          required
          value={landlordName}
          onChange={(e) => { setLandlordName(e.target.value); clearHeaderError('landlordName'); }}
          placeholder="Company or individual"
          error={headerErrors.landlordName}
        />
        <Input
          label="Broker Name"
          required
          value={brokerName}
          onChange={(e) => { setBrokerName(e.target.value); clearHeaderError('brokerName'); }}
          placeholder="Your name"
          error={headerErrors.brokerName}
        />
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
                  <sec.icon className={cn('h-5 w-5', hasError ? 'text-red-500' : filled ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-semibold">{sec.label}</span>
                  {sec.required && (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      hasError ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground',
                    )}>
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
        <Button variant="secondary" icon={Save}>
          Save as Draft
        </Button>
        <Button variant="secondary" icon={Eye}>
          Preview LOI
        </Button>
        <Button
          variant="primary"
          icon={Send}
          onClick={validateAndSend}
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
  onChange: <K extends keyof SectionData>(key: K, field: keyof SectionData[K], value: string) => void;
}) {
  switch (sectionKey) {
    case 'base_rent': {
      const d = data.base_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Monthly Amount ($)" type="text" value={d.monthlyAmount} onChange={(e) => onChange('base_rent', 'monthlyAmount', e.target.value)} placeholder="e.g. 5,000" />
          <Input label="Per SF Rate ($)" type="text" value={d.perSfRate} onChange={(e) => onChange('base_rent', 'perSfRate', e.target.value)} placeholder="e.g. 1.25" />
          <Input label="Rent Commencement Date" type="date" value={d.commencementDate} onChange={(e) => onChange('base_rent', 'commencementDate', e.target.value)} />
        </div>
      );
    }

    case 'term': {
      const d = data.term;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Years" type="number" min={0} value={d.years} onChange={(e) => onChange('term', 'years', e.target.value)} placeholder="e.g. 5" />
          <Input label="Months" type="number" min={0} max={11} value={d.months} onChange={(e) => onChange('term', 'months', e.target.value)} placeholder="e.g. 0" />
          <Input label="Commencement Date" type="date" value={d.commencementDate} onChange={(e) => onChange('term', 'commencementDate', e.target.value)} />
          <Input label="Expiration Date" type="date" value={d.expirationDate} onChange={(e) => onChange('term', 'expirationDate', e.target.value)} />
        </div>
      );
    }

    case 'tenant_improvements': {
      const d = data.tenant_improvements;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Dollar Amount ($)" type="text" value={d.amount} onChange={(e) => onChange('tenant_improvements', 'amount', e.target.value)} placeholder="e.g. 25,000" />
          <Input label="Description" type="text" value={d.description} onChange={(e) => onChange('tenant_improvements', 'description', e.target.value)} placeholder="Describe improvements" />
          <Select label="Who Pays" value={d.whoPays} onChange={(e) => onChange('tenant_improvements', 'whoPays', e.target.value)}>
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
          <Input label="Percentage (%)" type="text" value={d.percentage} onChange={(e) => onChange('cam', 'percentage', e.target.value)} placeholder="e.g. 15" />
          <Select label="Structure" value={d.structure} onChange={(e) => onChange('cam', 'structure', e.target.value)}>
            <option value="nnn">NNN (Triple Net)</option>
            <option value="modified_gross">Modified Gross</option>
            <option value="full_service">Full Service</option>
          </Select>
          <Input label="Base Year" type="text" value={d.baseYear} onChange={(e) => onChange('cam', 'baseYear', e.target.value)} placeholder="e.g. 2026" />
        </div>
      );
    }

    case 'security_deposit': {
      const d = data.security_deposit;
      return (
        <div className="max-w-xs">
          <Input label="Amount ($)" type="text" value={d.amount} onChange={(e) => onChange('security_deposit', 'amount', e.target.value)} placeholder="e.g. 10,000" />
        </div>
      );
    }

    case 'agreed_use': {
      const d = data.agreed_use;
      return (
        <Textarea label="Permitted Use" rows={3} value={d.description} onChange={(e) => onChange('agreed_use', 'description', e.target.value)} placeholder="Describe the permitted use of the premises" />
      );
    }

    case 'parking': {
      const d = data.parking;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input label="Number of Spaces" type="number" min={0} value={d.spaces} onChange={(e) => onChange('parking', 'spaces', e.target.value)} placeholder="e.g. 10" />
          <Select label="Type" value={d.type} onChange={(e) => onChange('parking', 'type', e.target.value)}>
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
          <Textarea label="Renewal Options" rows={2} value={d.renewalOptions} onChange={(e) => onChange('options', 'renewalOptions', e.target.value)} placeholder="e.g. Two (2) five-year renewal options at fair market value" />
          <Textarea label="Expansion Options" rows={2} value={d.expansionOptions} onChange={(e) => onChange('options', 'expansionOptions', e.target.value)} placeholder="e.g. Right to expand into adjacent Suite 102" />
          <Textarea label="Right of First Refusal" rows={2} value={d.rofr} onChange={(e) => onChange('options', 'rofr', e.target.value)} placeholder="e.g. ROFR on any adjacent space that becomes available" />
        </div>
      );
    }

    case 'escalations': {
      const d = data.escalations;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input label="Annual Increase (%)" type="text" value={d.annualIncrease} onChange={(e) => onChange('escalations', 'annualIncrease', e.target.value)} placeholder="e.g. 3" />
          <Input label="Schedule / Notes" type="text" value={d.schedule} onChange={(e) => onChange('escalations', 'schedule', e.target.value)} placeholder="e.g. Annual on anniversary" />
        </div>
      );
    }

    case 'free_rent': {
      const d = data.free_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <Input label="Number of Months" type="number" min={0} value={d.months} onChange={(e) => onChange('free_rent', 'months', e.target.value)} placeholder="e.g. 2" />
          <Input label="Conditions" type="text" value={d.conditions} onChange={(e) => onChange('free_rent', 'conditions', e.target.value)} placeholder="e.g. First 2 months of term" />
        </div>
      );
    }

    default:
      return null;
  }
}
