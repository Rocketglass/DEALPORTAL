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
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Send,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoiSectionKey, LoiSectionStatus, LoiStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const SECTION_ICONS: Record<LoiSectionKey, React.ElementType> = {
  base_rent: DollarSign,
  term: Calendar,
  tenant_improvements: Paintbrush,
  cam: BarChart3,
  security_deposit: Shield,
  agreed_use: FileCheck,
  parking: Car,
  options: RefreshCw,
  escalations: TrendingUp,
  free_rent: Gift,
  other: FileCheck,
};

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

const sectionStatusConfig: Record<LoiSectionStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  proposed: { label: 'Proposed', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  accepted: { label: 'Accepted', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  countered: { label: 'Countered', bg: 'bg-amber-50', text: 'text-amber-700', icon: MessageSquare },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
};

const loiStatusConfig: Record<LoiStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-700' },
  in_negotiation: { label: 'In Negotiation', bg: 'bg-amber-100', text: 'text-amber-700' },
  agreed: { label: 'Agreed', bg: 'bg-green-100', text: 'text-green-700' },
  expired: { label: 'Expired', bg: 'bg-gray-100', text: 'text-gray-600' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-gray-100', text: 'text-gray-600' },
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MockSection {
  id: string;
  sectionKey: LoiSectionKey;
  label: string;
  proposedValue: string;
  landlordResponse: string | null;
  agreedValue: string | null;
  status: LoiSectionStatus;
  history: { action: string; value: string; by: string; date: string }[];
}

const MOCK_LOI = {
  id: 'loi-001',
  property: 'Santee Business Park',
  suite: '101',
  tenant: 'Pacific Coast Logistics',
  landlord: 'East County Properties LLC',
  broker: 'Neil Bajaj',
  status: 'in_negotiation' as LoiStatus,
  version: 2,
  createdAt: '2026-02-15',
  sentAt: '2026-02-16',
};

const MOCK_SECTIONS: MockSection[] = [
  {
    id: 's1',
    sectionKey: 'base_rent',
    label: 'Base Rent',
    proposedValue: '$4,500/mo ($1.15/SF)',
    landlordResponse: '$5,000/mo ($1.28/SF)',
    agreedValue: null,
    status: 'countered',
    history: [
      { action: 'Proposed', value: '$4,500/mo ($1.15/SF)', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Countered', value: '$5,000/mo ($1.28/SF)', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's2',
    sectionKey: 'term',
    label: 'Term',
    proposedValue: '5 years, commencing June 1, 2026',
    landlordResponse: null,
    agreedValue: '5 years, commencing June 1, 2026',
    status: 'accepted',
    history: [
      { action: 'Proposed', value: '5 years, commencing June 1, 2026', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Accepted', value: '5 years, commencing June 1, 2026', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's3',
    sectionKey: 'tenant_improvements',
    label: 'Tenant Improvements',
    proposedValue: '$30,000 TI allowance, landlord-funded',
    landlordResponse: '$20,000 TI allowance, landlord-funded',
    agreedValue: null,
    status: 'countered',
    history: [
      { action: 'Proposed', value: '$30,000 TI allowance, landlord-funded', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Countered', value: '$20,000 TI allowance, landlord-funded', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's4',
    sectionKey: 'cam',
    label: 'CAM / Operating Expenses',
    proposedValue: 'NNN, 12% pro-rata share, base year 2026',
    landlordResponse: null,
    agreedValue: 'NNN, 12% pro-rata share, base year 2026',
    status: 'accepted',
    history: [
      { action: 'Proposed', value: 'NNN, 12% pro-rata share, base year 2026', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Accepted', value: 'NNN, 12% pro-rata share, base year 2026', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's5',
    sectionKey: 'security_deposit',
    label: 'Security Deposit',
    proposedValue: '$9,000 (2 months rent)',
    landlordResponse: null,
    agreedValue: '$9,000 (2 months rent)',
    status: 'accepted',
    history: [
      { action: 'Proposed', value: '$9,000 (2 months rent)', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Accepted', value: '$9,000 (2 months rent)', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's6',
    sectionKey: 'agreed_use',
    label: 'Agreed Use',
    proposedValue: 'Warehousing, distribution, and light assembly',
    landlordResponse: null,
    agreedValue: 'Warehousing, distribution, and light assembly',
    status: 'accepted',
    history: [
      { action: 'Proposed', value: 'Warehousing, distribution, and light assembly', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Accepted', value: 'Warehousing, distribution, and light assembly', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's7',
    sectionKey: 'parking',
    label: 'Parking',
    proposedValue: '8 unreserved spaces',
    landlordResponse: null,
    agreedValue: null,
    status: 'proposed',
    history: [
      { action: 'Proposed', value: '8 unreserved spaces', by: 'Neil Bajaj', date: '2026-02-16' },
    ],
  },
  {
    id: 's8',
    sectionKey: 'options',
    label: 'Options',
    proposedValue: 'One (1) 5-year renewal option at fair market value',
    landlordResponse: null,
    agreedValue: null,
    status: 'proposed',
    history: [
      { action: 'Proposed', value: 'One (1) 5-year renewal option at fair market value', by: 'Neil Bajaj', date: '2026-02-16' },
    ],
  },
  {
    id: 's9',
    sectionKey: 'escalations',
    label: 'Rent Escalations',
    proposedValue: '3% annual increase on lease anniversary',
    landlordResponse: null,
    agreedValue: '3% annual increase on lease anniversary',
    status: 'accepted',
    history: [
      { action: 'Proposed', value: '3% annual increase on lease anniversary', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Accepted', value: '3% annual increase on lease anniversary', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
  {
    id: 's10',
    sectionKey: 'free_rent',
    label: 'Free Rent',
    proposedValue: '2 months free rent at commencement',
    landlordResponse: null,
    agreedValue: null,
    status: 'rejected',
    history: [
      { action: 'Proposed', value: '2 months free rent at commencement', by: 'Neil Bajaj', date: '2026-02-16' },
      { action: 'Rejected', value: 'No free rent concession available', by: 'East County Properties', date: '2026-02-18' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoiDetailPage() {
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  function toggleHistory(id: string) {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const agreed = MOCK_SECTIONS.filter((s) => s.status === 'accepted').length;
  const countered = MOCK_SECTIONS.filter((s) => s.status === 'countered').length;
  const pending = MOCK_SECTIONS.filter((s) => s.status === 'proposed').length;
  const rejected = MOCK_SECTIONS.filter((s) => s.status === 'rejected').length;
  const total = MOCK_SECTIONS.length;
  const progressPercent = Math.round((agreed / total) * 100);

  const loiStatus = loiStatusConfig[MOCK_LOI.status];

  return (
    <div className="p-6 lg:p-8">
      {/* Navigation */}
      <Link
        href="/lois"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to LOIs
      </Link>

      {/* LOI header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{MOCK_LOI.property}</h1>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', loiStatus.bg, loiStatus.text)}>
              {loiStatus.label}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Suite {MOCK_LOI.suite} &middot; Version {MOCK_LOI.version}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Tenant: <span className="font-medium text-foreground">{MOCK_LOI.tenant}</span></span>
            <span>Landlord: <span className="font-medium text-foreground">{MOCK_LOI.landlord}</span></span>
            <span>Broker: <span className="font-medium text-foreground">{MOCK_LOI.broker}</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            <Send className="h-4 w-4" />
            Resend
          </button>
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Section cards */}
        <div className="space-y-3">
          {MOCK_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.sectionKey];
            const statusCfg = sectionStatusConfig[section.status];
            const StatusIcon = statusCfg.icon;
            const historyOpen = expandedHistory.has(section.id);

            return (
              <div key={section.id} className="rounded-xl bg-white shadow-sm">
                <div className="px-5 py-4">
                  {/* Section header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{section.label}</span>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.bg, statusCfg.text)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Values */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Proposed</p>
                      <p className="mt-0.5 text-sm">{section.proposedValue}</p>
                    </div>
                    {section.landlordResponse && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Landlord Response</p>
                        <p className="mt-0.5 text-sm">{section.landlordResponse}</p>
                      </div>
                    )}
                    {section.agreedValue && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Agreed</p>
                        <p className="mt-0.5 text-sm font-medium text-green-700">{section.agreedValue}</p>
                      </div>
                    )}
                  </div>

                  {/* History toggle */}
                  <button
                    type="button"
                    onClick={() => toggleHistory(section.id)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Negotiation History ({section.history.length})
                  </button>
                </div>

                {/* Expanded history */}
                {historyOpen && (
                  <div className="border-t border-border px-5 pb-4 pt-3">
                    <div className="space-y-2">
                      {section.history.map((entry, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div>
                            <span className="font-medium">{entry.action}</span>
                            <span className="text-muted-foreground"> by {entry.by}</span>
                            <span className="text-muted-foreground"> &middot; {entry.date}</span>
                            <p className="mt-0.5 text-muted-foreground">{entry.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Negotiation Progress</h3>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agreed} of {total} sections agreed</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Accepted
                </span>
                <span className="font-medium">{agreed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Countered
                </span>
                <span className="font-medium">{countered}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Pending
                </span>
                <span className="font-medium">{pending}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Rejected
                </span>
                <span className="font-medium">{rejected}</span>
              </div>
            </div>
          </div>

          {/* Key dates */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Key Dates</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{MOCK_LOI.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{MOCK_LOI.sentAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>{MOCK_LOI.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
