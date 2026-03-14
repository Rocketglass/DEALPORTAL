'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  }

  const canSend = property.trim() !== '' && tenantName.trim() !== '' && landlordName.trim() !== '' && requiredSectionsFilled(sections);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <Link
        href="/lois"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to LOIs
      </Link>

      <h1 className="text-2xl font-bold">Create Letter of Intent</h1>
      <p className="mt-1 text-muted-foreground">
        Fill in the deal terms below. Expand each section to enter details.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Header fields                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Property</label>
          <input
            type="text"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            placeholder="Search or enter property name"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Suite</label>
          <input
            type="text"
            value={suite}
            onChange={(e) => setSuite(e.target.value)}
            placeholder="e.g. 101"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Tenant Name</label>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Company or individual"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Landlord Name</label>
          <input
            type="text"
            value={landlordName}
            onChange={(e) => setLandlordName(e.target.value)}
            placeholder="Company or individual"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Broker Name</label>
          <input
            type="text"
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 space-y-3">
        {SECTIONS.map((sec) => {
          const isExpanded = expanded.has(sec.key);
          const filled = isFilled(sec.key, sections);

          return (
            <div
              key={sec.key}
              className={cn(
                'rounded-xl bg-white shadow-sm transition-colors',
                filled ? 'ring-1 ring-primary/40' : '',
              )}
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => toggle(sec.key)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <sec.icon className={cn('h-5 w-5', filled ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-semibold">{sec.label}</span>
                  {sec.required && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {filled && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Filled
                    </span>
                  )}
                  {!filled && !isExpanded && (
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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Save className="h-4 w-4" />
          Save as Draft
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Eye className="h-4 w-4" />
          Preview LOI
        </button>
        <button
          type="button"
          disabled={!canSend}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white',
            canSend
              ? 'bg-primary hover:bg-primary-light'
              : 'cursor-not-allowed bg-primary/40',
          )}
        >
          <Send className="h-4 w-4" />
          Send to Landlord
        </button>
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
  const inputClass =
    'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
  const labelClass = 'mb-1.5 block text-sm font-medium';

  switch (sectionKey) {
    case 'base_rent': {
      const d = data.base_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Monthly Amount ($)</label>
            <input type="text" value={d.monthlyAmount} onChange={(e) => onChange('base_rent', 'monthlyAmount', e.target.value)} placeholder="e.g. 5,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Per SF Rate ($)</label>
            <input type="text" value={d.perSfRate} onChange={(e) => onChange('base_rent', 'perSfRate', e.target.value)} placeholder="e.g. 1.25" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rent Commencement Date</label>
            <input type="date" value={d.commencementDate} onChange={(e) => onChange('base_rent', 'commencementDate', e.target.value)} className={inputClass} />
          </div>
        </div>
      );
    }

    case 'term': {
      const d = data.term;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Years</label>
            <input type="number" min="0" value={d.years} onChange={(e) => onChange('term', 'years', e.target.value)} placeholder="e.g. 5" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Months</label>
            <input type="number" min="0" max="11" value={d.months} onChange={(e) => onChange('term', 'months', e.target.value)} placeholder="e.g. 0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Commencement Date</label>
            <input type="date" value={d.commencementDate} onChange={(e) => onChange('term', 'commencementDate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expiration Date</label>
            <input type="date" value={d.expirationDate} onChange={(e) => onChange('term', 'expirationDate', e.target.value)} className={inputClass} />
          </div>
        </div>
      );
    }

    case 'tenant_improvements': {
      const d = data.tenant_improvements;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Dollar Amount ($)</label>
            <input type="text" value={d.amount} onChange={(e) => onChange('tenant_improvements', 'amount', e.target.value)} placeholder="e.g. 25,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input type="text" value={d.description} onChange={(e) => onChange('tenant_improvements', 'description', e.target.value)} placeholder="Describe improvements" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Who Pays</label>
            <select value={d.whoPays} onChange={(e) => onChange('tenant_improvements', 'whoPays', e.target.value)} className={inputClass}>
              <option value="landlord">Landlord</option>
              <option value="tenant">Tenant</option>
              <option value="shared">Shared</option>
            </select>
          </div>
        </div>
      );
    }

    case 'cam': {
      const d = data.cam;
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Percentage (%)</label>
            <input type="text" value={d.percentage} onChange={(e) => onChange('cam', 'percentage', e.target.value)} placeholder="e.g. 15" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Structure</label>
            <select value={d.structure} onChange={(e) => onChange('cam', 'structure', e.target.value)} className={inputClass}>
              <option value="nnn">NNN (Triple Net)</option>
              <option value="modified_gross">Modified Gross</option>
              <option value="full_service">Full Service</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Base Year</label>
            <input type="text" value={d.baseYear} onChange={(e) => onChange('cam', 'baseYear', e.target.value)} placeholder="e.g. 2026" className={inputClass} />
          </div>
        </div>
      );
    }

    case 'security_deposit': {
      const d = data.security_deposit;
      return (
        <div className="max-w-xs">
          <label className={labelClass}>Amount ($)</label>
          <input type="text" value={d.amount} onChange={(e) => onChange('security_deposit', 'amount', e.target.value)} placeholder="e.g. 10,000" className={inputClass} />
        </div>
      );
    }

    case 'agreed_use': {
      const d = data.agreed_use;
      return (
        <div>
          <label className={labelClass}>Permitted Use</label>
          <textarea rows={3} value={d.description} onChange={(e) => onChange('agreed_use', 'description', e.target.value)} placeholder="Describe the permitted use of the premises" className={cn(inputClass, 'resize-none')} />
        </div>
      );
    }

    case 'parking': {
      const d = data.parking;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <div>
            <label className={labelClass}>Number of Spaces</label>
            <input type="number" min="0" value={d.spaces} onChange={(e) => onChange('parking', 'spaces', e.target.value)} placeholder="e.g. 10" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={d.type} onChange={(e) => onChange('parking', 'type', e.target.value)} className={inputClass}>
              <option value="unreserved">Unreserved</option>
              <option value="reserved">Reserved</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      );
    }

    case 'options': {
      const d = data.options;
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Renewal Options</label>
            <textarea rows={2} value={d.renewalOptions} onChange={(e) => onChange('options', 'renewalOptions', e.target.value)} placeholder="e.g. Two (2) five-year renewal options at fair market value" className={cn(inputClass, 'resize-none')} />
          </div>
          <div>
            <label className={labelClass}>Expansion Options</label>
            <textarea rows={2} value={d.expansionOptions} onChange={(e) => onChange('options', 'expansionOptions', e.target.value)} placeholder="e.g. Right to expand into adjacent Suite 102" className={cn(inputClass, 'resize-none')} />
          </div>
          <div>
            <label className={labelClass}>Right of First Refusal</label>
            <textarea rows={2} value={d.rofr} onChange={(e) => onChange('options', 'rofr', e.target.value)} placeholder="e.g. ROFR on any adjacent space that becomes available" className={cn(inputClass, 'resize-none')} />
          </div>
        </div>
      );
    }

    case 'escalations': {
      const d = data.escalations;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <div>
            <label className={labelClass}>Annual Increase (%)</label>
            <input type="text" value={d.annualIncrease} onChange={(e) => onChange('escalations', 'annualIncrease', e.target.value)} placeholder="e.g. 3" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Schedule / Notes</label>
            <input type="text" value={d.schedule} onChange={(e) => onChange('escalations', 'schedule', e.target.value)} placeholder="e.g. Annual on anniversary" className={inputClass} />
          </div>
        </div>
      );
    }

    case 'free_rent': {
      const d = data.free_rent;
      return (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <div>
            <label className={labelClass}>Number of Months</label>
            <input type="number" min="0" value={d.months} onChange={(e) => onChange('free_rent', 'months', e.target.value)} placeholder="e.g. 2" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Conditions</label>
            <input type="text" value={d.conditions} onChange={(e) => onChange('free_rent', 'conditions', e.target.value)} placeholder="e.g. First 2 months of term" className={inputClass} />
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
