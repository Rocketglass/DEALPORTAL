'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
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
  Check,
  X,
  MessageSquare,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoiSectionKey } from '@/types/database';

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const SECTION_ICONS: Record<string, React.ElementType> = {
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
};

// ---------------------------------------------------------------------------
// Mock data — what the landlord sees
// ---------------------------------------------------------------------------

interface ReviewSection {
  id: string;
  sectionKey: LoiSectionKey;
  label: string;
  proposedValue: string;
}

const MOCK_LOI_META = {
  property: 'Santee Business Park',
  suite: '101',
  tenant: 'Pacific Coast Logistics',
  broker: 'Neil Bajaj',
  brokerCompany: 'Rocket Glass, CCIM',
  sentAt: '2026-02-16',
};

const MOCK_REVIEW_SECTIONS: ReviewSection[] = [
  { id: 'r1', sectionKey: 'base_rent', label: 'Base Rent', proposedValue: '$4,500/mo ($1.15/SF)' },
  { id: 'r2', sectionKey: 'term', label: 'Term', proposedValue: '5 years, commencing June 1, 2026, expiring May 31, 2031' },
  { id: 'r3', sectionKey: 'tenant_improvements', label: 'Tenant Improvements', proposedValue: '$30,000 TI allowance, landlord-funded' },
  { id: 'r4', sectionKey: 'cam', label: 'CAM / Operating Expenses', proposedValue: 'NNN, 12% pro-rata share, base year 2026' },
  { id: 'r5', sectionKey: 'security_deposit', label: 'Security Deposit', proposedValue: '$9,000 (2 months rent)' },
  { id: 'r6', sectionKey: 'agreed_use', label: 'Agreed Use', proposedValue: 'Warehousing, distribution, and light assembly' },
  { id: 'r7', sectionKey: 'parking', label: 'Parking', proposedValue: '8 unreserved spaces' },
  { id: 'r8', sectionKey: 'options', label: 'Options', proposedValue: 'One (1) 5-year renewal option at fair market value' },
  { id: 'r9', sectionKey: 'escalations', label: 'Rent Escalations', proposedValue: '3% annual increase on lease anniversary' },
  { id: 'r10', sectionKey: 'free_rent', label: 'Free Rent', proposedValue: '2 months free rent at commencement' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResponseAction = 'accept' | 'counter' | 'reject' | null;

interface SectionResponse {
  action: ResponseAction;
  counterValue: string;
  rejectReason: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoiReviewPage() {
  const [responses, setResponses] = useState<Record<string, SectionResponse>>(() => {
    const init: Record<string, SectionResponse> = {};
    MOCK_REVIEW_SECTIONS.forEach((s) => {
      init[s.id] = { action: null, counterValue: '', rejectReason: '' };
    });
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  function setAction(id: string, action: ResponseAction) {
    setResponses((prev) => ({
      ...prev,
      [id]: { ...prev[id], action: prev[id].action === action ? null : action },
    }));
  }

  function updateField(id: string, field: 'counterValue' | 'rejectReason', value: string) {
    setResponses((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  const allResponded = MOCK_REVIEW_SECTIONS.every((s) => responses[s.id].action !== null);
  const respondedCount = MOCK_REVIEW_SECTIONS.filter((s) => responses[s.id].action !== null).length;

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted">
        {/* Header */}
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-4 sm:px-6">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold">Responses Submitted</h1>
            <p className="mt-2 text-muted-foreground">
              Your responses have been submitted successfully. The broker has been notified and will follow up shortly.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {MOCK_LOI_META.property} &middot; Suite {MOCK_LOI_META.suite}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* LOI header card */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Letter of Intent Review
          </p>
          <h1 className="mt-2 text-2xl font-bold">{MOCK_LOI_META.property}</h1>
          <p className="mt-1 text-muted-foreground">Suite {MOCK_LOI_META.suite}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Tenant: <span className="font-medium text-foreground">{MOCK_LOI_META.tenant}</span></span>
            <span>Broker: <span className="font-medium text-foreground">{MOCK_LOI_META.broker}</span>, {MOCK_LOI_META.brokerCompany}</span>
            <span>Sent: <span className="font-medium text-foreground">{MOCK_LOI_META.sentAt}</span></span>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Please review each section below and accept, counter, or reject. You may submit all responses at once using the button at the bottom.
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>{respondedCount} of {MOCK_REVIEW_SECTIONS.length} sections reviewed</span>
          <span>{Math.round((respondedCount / MOCK_REVIEW_SECTIONS.length) * 100)}% complete</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white shadow-sm">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(respondedCount / MOCK_REVIEW_SECTIONS.length) * 100}%` }}
          />
        </div>

        {/* Section cards */}
        <div className="mt-6 space-y-3">
          {MOCK_REVIEW_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.sectionKey] || FileCheck;
            const response = responses[section.id];
            const isAccepted = response.action === 'accept';
            const isCountered = response.action === 'counter';
            const isRejected = response.action === 'reject';

            return (
              <div
                key={section.id}
                className={cn(
                  'rounded-xl bg-white shadow-sm transition-all',
                  isAccepted && 'ring-1 ring-green-300',
                  isCountered && 'ring-1 ring-amber-300',
                  isRejected && 'ring-1 ring-red-300',
                )}
              >
                <div className="px-5 py-4">
                  {/* Section header */}
                  <div className="flex items-center gap-3">
                    <Icon className={cn(
                      'h-5 w-5',
                      isAccepted ? 'text-green-600' : isRejected ? 'text-red-500' : isCountered ? 'text-amber-600' : 'text-muted-foreground',
                    )} />
                    <span className="text-sm font-semibold">{section.label}</span>
                    {isAccepted && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Accepted</span>
                    )}
                    {isCountered && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Countered</span>
                    )}
                    {isRejected && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>
                    )}
                  </div>

                  {/* Proposed value */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">Proposed Terms</p>
                    <p className="mt-0.5 text-sm">{section.proposedValue}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAction(section.id, 'accept')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                        isAccepted
                          ? 'bg-green-600 text-white'
                          : 'border border-green-200 text-green-700 hover:bg-green-50',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(section.id, 'counter')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                        isCountered
                          ? 'bg-amber-500 text-white'
                          : 'border border-amber-200 text-amber-700 hover:bg-amber-50',
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Counter
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(section.id, 'reject')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                        isRejected
                          ? 'bg-red-600 text-white'
                          : 'border border-red-200 text-red-700 hover:bg-red-50',
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>

                  {/* Counter text area */}
                  {isCountered && (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-medium">
                        Your Counter-Proposal
                      </label>
                      <textarea
                        rows={3}
                        value={response.counterValue}
                        onChange={(e) => updateField(section.id, 'counterValue', e.target.value)}
                        placeholder="Enter your proposed terms and any notes..."
                        className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Reject reason */}
                  {isRejected && (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-medium">
                        Reason (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={response.rejectReason}
                        onChange={(e) => updateField(section.id, 'rejectReason', e.target.value)}
                        placeholder="Provide a reason for rejecting this section..."
                        className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit bar */}
        <div className="mt-8 flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {allResponded
              ? 'All sections reviewed. Ready to submit.'
              : `${MOCK_REVIEW_SECTIONS.length - respondedCount} section(s) remaining.`}
          </p>
          <button
            type="button"
            disabled={!allResponded}
            onClick={() => setSubmitted(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white',
              allResponded
                ? 'bg-primary hover:bg-primary-light'
                : 'cursor-not-allowed bg-primary/40',
            )}
          >
            <Send className="h-4 w-4" />
            Submit All Responses
          </button>
        </div>
      </main>
    </div>
  );
}
