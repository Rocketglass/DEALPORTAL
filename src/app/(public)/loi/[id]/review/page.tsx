'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Loader2,
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
// Types
// ---------------------------------------------------------------------------

interface LoiSection {
  id: string;
  sectionKey: LoiSectionKey;
  label: string;
  proposedValue: string;
}

interface LoiMeta {
  property: string;
  suite: string;
  tenant: string;
  broker: string;
  brokerCompany: string;
  sentAt: string | null;
}

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
  const params = useParams<{ id: string }>();
  const loiId = params.id;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loiMeta, setLoiMeta] = useState<LoiMeta | null>(null);
  const [sections, setSections] = useState<LoiSection[]>([]);
  const [responses, setResponses] = useState<Record<string, SectionResponse>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load LOI data on mount
  useEffect(() => {
    if (!loiId) return;

    async function loadLoi() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/lois/${loiId}/review-data`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setFetchError(json.error ?? 'Failed to load LOI');
          return;
        }
        const json = await res.json();
        setLoiMeta(json.meta);
        setSections(json.sections);
        // Initialise response state
        const init: Record<string, SectionResponse> = {};
        json.sections.forEach((s: LoiSection) => {
          init[s.id] = { action: null, counterValue: '', rejectReason: '' };
        });
        setResponses(init);
      } catch {
        setFetchError('Unable to load LOI. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    void loadLoi();
  }, [loiId]);

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

  const allResponded = sections.every((s) => responses[s.id]?.action !== null);
  const respondedCount = sections.filter((s) => responses[s.id]?.action !== null).length;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = sections.map((s) => {
        const r = responses[s.id];
        return {
          sectionId: s.id,
          action: r.action as 'accept' | 'counter' | 'reject',
          value: r.action === 'counter' ? r.counterValue : undefined,
          note: r.action === 'reject' ? r.rejectReason : undefined,
        };
      });

      const res = await fetch(`/api/lois/${loiId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: payload }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(json.error ?? 'Failed to submit responses. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading your LOI review…</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (fetchError || !loiMeta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm text-center">
          <X className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-lg font-bold">Unable to Load LOI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {fetchError ?? 'This LOI could not be found or is no longer available.'}
          </p>
        </div>
      </div>
    );
  }

  // --- Submitted confirmation ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-muted">
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
              {loiMeta.property}
              {loiMeta.suite && ` \u00b7 Suite ${loiMeta.suite}`}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --- Review form ---
  return (
    <div className="min-h-screen bg-muted">
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
          <h1 className="mt-2 text-2xl font-bold">{loiMeta.property}</h1>
          {loiMeta.suite && (
            <p className="mt-1 text-muted-foreground">Suite {loiMeta.suite}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              Tenant: <span className="font-medium text-foreground">{loiMeta.tenant}</span>
            </span>
            <span>
              Broker:{' '}
              <span className="font-medium text-foreground">{loiMeta.broker}</span>
              {loiMeta.brokerCompany && `, ${loiMeta.brokerCompany}`}
            </span>
            {loiMeta.sentAt && (
              <span>
                Sent:{' '}
                <span className="font-medium text-foreground">
                  {new Date(loiMeta.sentAt).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Please review each section below and accept, counter, or reject. You may submit all responses at once using the button at the bottom.
          </div>
        </div>

        {/* Progress indicator */}
        {sections.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <span>{respondedCount} of {sections.length} sections reviewed</span>
              <span>{Math.round((respondedCount / sections.length) * 100)}% complete</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white shadow-sm">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(respondedCount / sections.length) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* Section cards */}
        <div className="mt-6 space-y-3">
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section.sectionKey] || FileCheck;
            const response = responses[section.id];
            if (!response) return null;
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
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isAccepted
                          ? 'text-green-600'
                          : isRejected
                            ? 'text-red-500'
                            : isCountered
                              ? 'text-amber-600'
                              : 'text-muted-foreground',
                      )}
                    />
                    <span className="text-sm font-semibold">{section.label}</span>
                    {isAccepted && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Accepted
                      </span>
                    )}
                    {isCountered && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Countered
                      </span>
                    )}
                    {isRejected && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Rejected
                      </span>
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
        <div className="mt-8 rounded-xl bg-white px-5 py-4 shadow-sm">
          {submitError && (
            <p className="mb-3 text-sm text-destructive">{submitError}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {allResponded
                ? 'All sections reviewed. Ready to submit.'
                : `${sections.length - respondedCount} section(s) remaining.`}
            </p>
            <button
              type="button"
              disabled={!allResponded || submitting}
              onClick={handleSubmit}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white',
                allResponded && !submitting
                  ? 'bg-primary hover:bg-primary-light'
                  : 'cursor-not-allowed bg-primary/40',
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? 'Submitting…' : 'Submit All Responses'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
