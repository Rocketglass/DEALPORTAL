'use client';

import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ArrowRightLeft,
  History,
  User,
  Building2,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LoiSectionKey, LoiSectionStatus, NegotiationAction } from '@/types/database';

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

const sectionStatusConfig: Record<LoiSectionStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  proposed: { label: 'Proposed', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  accepted: { label: 'Accepted', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  countered: { label: 'Countered', bg: 'bg-amber-50', text: 'text-amber-700', icon: MessageSquare },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
};

const ACTION_CONFIG: Record<NegotiationAction, { label: string; icon: React.ElementType; badgeStatus: string }> = {
  propose: { label: 'Proposed', icon: Clock, badgeStatus: 'proposed' },
  counter: { label: 'Countered', icon: ArrowRightLeft, badgeStatus: 'countered' },
  accept: { label: 'Accepted', icon: CheckCircle2, badgeStatus: 'accepted' },
  reject: { label: 'Rejected', icon: XCircle, badgeStatus: 'rejected' },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NegotiationEntry {
  id: string;
  action: string;
  value: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

interface LoiSectionData {
  id: string;
  sectionKey: LoiSectionKey;
  label: string;
  proposedValue: string;
  status: LoiSectionStatus;
  landlordResponse: string | null;
  agreedValue: string | null;
  updatedAt: string;
  negotiations: NegotiationEntry[];
}

interface LoiMeta {
  property: string;
  suite: string | null;
  tenant: string | null;
  broker: string | null;
  brokerCompany: string | null;
  landlord: string | null;
  sentAt: string | null;
  landlordContactId: string | null;
  tenantContactId: string | null;
  brokerContactId: string | null;
}

interface ReviewData {
  meta: LoiMeta;
  sections: LoiSectionData[];
  callerRole: string;
}

type SectionAction = 'accept' | 'counter' | 'reject' | null;

interface SectionResponse {
  action: SectionAction;
  counterValue: string;
  rejectReason: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoiNegotiationViewProps {
  loiId: string;
  callerRole: string;
  portalBasePath: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine the actor's party role from created_by (contact UUID or legacy role string) */
function actorRole(
  createdBy: string | null | undefined,
  contactIds?: { landlord?: string | null; tenant?: string | null; broker?: string | null },
): 'broker' | 'landlord' | 'tenant' {
  if (!createdBy) return 'broker';
  // Match against contact IDs if available (new data stores contact UUIDs)
  if (contactIds) {
    if (contactIds.landlord && createdBy === contactIds.landlord) return 'landlord';
    if (contactIds.tenant && createdBy === contactIds.tenant) return 'tenant';
    if (contactIds.broker && createdBy === contactIds.broker) return 'broker';
  }
  // Fallback: handle legacy role strings
  const lower = createdBy.toLowerCase();
  if (lower.includes('landlord') || lower.includes('owner') || lower.includes('lessor')) {
    return 'landlord';
  }
  if (lower.includes('tenant') || lower.includes('lessee')) {
    return 'tenant';
  }
  return 'broker';
}

function formatTimelineDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimelineTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Timeline Entry Component
// ---------------------------------------------------------------------------

function TimelineEntry({
  entry,
  isFirst,
  isLast,
  contactIds,
}: {
  entry: NegotiationEntry;
  isFirst: boolean;
  isLast: boolean;
  contactIds?: { landlord?: string | null; tenant?: string | null; broker?: string | null };
}) {
  const role = actorRole(entry.createdBy, contactIds);
  const actionKey = entry.action as NegotiationAction;
  const config = ACTION_CONFIG[actionKey] ?? ACTION_CONFIG.propose;

  const isBroker = role === 'broker';
  const isLandlord = role === 'landlord';
  const dotColor = isBroker ? 'bg-[#1e40af]' : isLandlord ? 'bg-amber-500' : 'bg-emerald-500';
  const ringColor = isBroker ? 'ring-blue-100' : isLandlord ? 'ring-amber-100' : 'ring-emerald-100';
  const labelColor = isBroker ? 'text-[#1e40af]' : isLandlord ? 'text-amber-700' : 'text-emerald-700';
  const RoleIcon = isBroker ? User : isLandlord ? Building2 : User;

  return (
    <div className="relative flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-px flex-none',
            isFirst ? 'h-3 bg-transparent' : 'h-3 bg-slate-200',
          )}
        />
        <div
          className={cn(
            'relative z-10 flex h-3 w-3 flex-none items-center justify-center rounded-full ring-4',
            dotColor,
            ringColor,
          )}
        />
        <div
          className={cn(
            'w-px flex-1',
            isLast ? 'bg-transparent' : 'bg-slate-200',
          )}
        />
      </div>

      {/* Content card */}
      <div className={cn('mb-3 flex-1 rounded-lg border p-3', isLast ? 'mb-0' : '')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RoleIcon className={cn('h-3.5 w-3.5', labelColor)} />
            <span className={cn('text-xs font-semibold', labelColor)}>
              {actorRole(entry.createdBy, contactIds).charAt(0).toUpperCase() + actorRole(entry.createdBy, contactIds).slice(1)}
            </span>
            <Badge status={config.badgeStatus} size="sm" />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#64748b]">
            <Clock className="h-3 w-3" />
            <span>{formatTimelineDate(entry.createdAt)}</span>
            <span className="text-slate-300">&middot;</span>
            <span>{formatTimelineTime(entry.createdAt)}</span>
          </div>
        </div>

        {entry.value && (
          <div className="mt-2 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-[#64748b]">Proposed Value</p>
            <p className="mt-0.5 text-sm font-medium text-[#0f172a]">{entry.value}</p>
          </div>
        )}

        {entry.note && (
          <p className="mt-2 text-xs italic text-[#64748b]">
            &ldquo;{entry.note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card Component
// ---------------------------------------------------------------------------

function SectionCard({
  section,
  response,
  submittingSection,
  successSection,
  onAction,
  onUpdateField,
  onSubmit,
  contactIds,
}: {
  section: LoiSectionData;
  response: SectionResponse;
  submittingSection: string | null;
  successSection: string | null;
  onAction: (id: string, action: SectionAction) => void;
  onUpdateField: (id: string, field: 'counterValue' | 'rejectReason', value: string) => void;
  onSubmit: (section: LoiSectionData) => void;
  contactIds?: { landlord?: string | null; tenant?: string | null; broker?: string | null };
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const Icon = SECTION_ICONS[section.sectionKey] ?? FileCheck;
  const statusCfg = sectionStatusConfig[section.status];
  const StatusIcon = statusCfg.icon;

  const sortedNegotiations = [...(section.negotiations ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const latest = sortedNegotiations[sortedNegotiations.length - 1];

  const isSubmitting = submittingSection === section.id;
  const isSuccess = successSection === section.id;
  const canAct = section.status !== 'accepted';

  const isAccepted = response.action === 'accept';
  const isCountered = response.action === 'counter';
  const isRejected = response.action === 'reject';

  return (
    <Card
      className={cn(
        'transition-all',
        isAccepted && 'ring-1 ring-green-300',
        isCountered && 'ring-1 ring-amber-300',
        isRejected && 'ring-1 ring-red-300',
      )}
    >
      <div className="px-5 py-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Icon className="h-4 w-4 text-[#64748b]" />
            </div>
            <span className="text-sm font-semibold text-[#0f172a]">{section.label}</span>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusCfg.bg,
              statusCfg.text,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>

        {/* Values */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-[#64748b]">Proposed</p>
            <p className="mt-0.5 text-sm text-[#0f172a]">{section.proposedValue}</p>
          </div>
          {section.landlordResponse && (
            <div>
              <p className="text-xs font-medium text-[#64748b]">Landlord Response</p>
              <p className="mt-0.5 text-sm text-[#0f172a]">{section.landlordResponse}</p>
            </div>
          )}
          {section.agreedValue && (
            <div>
              <p className="text-xs font-medium text-[#64748b]">Agreed</p>
              <p className="mt-0.5 text-sm font-medium text-green-700">{section.agreedValue}</p>
            </div>
          )}
        </div>

        {/* Action buttons — only for sections that aren't already accepted */}
        {canAct && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAction(section.id, 'accept')}
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
              onClick={() => onAction(section.id, 'counter')}
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
              onClick={() => onAction(section.id, 'reject')}
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
        )}

        {/* Counter textarea */}
        {isCountered && (
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-[#0f172a]">
              Your Counter-Proposal
            </label>
            <textarea
              rows={3}
              value={response.counterValue}
              onChange={(e) => onUpdateField(section.id, 'counterValue', e.target.value)}
              placeholder="Enter your proposed terms and any notes..."
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Reject reason textarea */}
        {isRejected && (
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-[#0f172a]">
              Reason (optional)
            </label>
            <textarea
              rows={2}
              value={response.rejectReason}
              onChange={(e) => onUpdateField(section.id, 'rejectReason', e.target.value)}
              placeholder="Provide a reason for rejecting this section..."
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Per-section submit button */}
        {response.action && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSubmit(section)}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                isSubmitting
                  ? 'cursor-not-allowed bg-primary/40'
                  : 'bg-primary hover:bg-blue-700',
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? 'Submitting…' : 'Submit Response'}
            </button>
            {isSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Response recorded
              </span>
            )}
          </div>
        )}

        {/* Latest activity summary (collapsed state) */}
        {latest && !historyOpen && !response.action && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                actorRole(latest.createdBy, contactIds) === 'broker'
                  ? 'bg-[#1e40af]'
                  : actorRole(latest.createdBy, contactIds) === 'landlord'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500',
              )}
            />
            <span className="text-xs text-[#64748b]">
              Latest: <span className="font-medium text-[#0f172a]">{actorRole(latest.createdBy, contactIds).charAt(0).toUpperCase() + actorRole(latest.createdBy, contactIds).slice(1)}</span>
              {' '}{ACTION_CONFIG[latest.action as NegotiationAction]?.label.toLowerCase() ?? latest.action}
              {latest.value ? ` — ${latest.value}` : ''}
              <span className="ml-1.5 text-slate-400">{formatTimelineDate(latest.createdAt)}</span>
            </span>
          </div>
        )}

        {/* History toggle */}
        {sortedNegotiations.length > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            aria-controls={`history-${section.id}`}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              historyOpen
                ? 'bg-[#1e40af]/10 text-[#1e40af]'
                : 'text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a]',
            )}
          >
            <History className="h-3.5 w-3.5" />
            {historyOpen ? (
              <>
                Hide History
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                View History ({sortedNegotiations.length} {sortedNegotiations.length === 1 ? 'entry' : 'entries'})
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded timeline history */}
      {historyOpen && sortedNegotiations.length > 0 && (
        <div
          id={`history-${section.id}`}
          className="border-t border-border bg-slate-50/50 px-5 pb-4 pt-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-[#64748b]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Negotiation Timeline
            </h4>
          </div>

          {/* Three-party legend */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#1e40af]" />
              <span className="text-[11px] font-medium text-[#64748b]">Broker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-medium text-[#64748b]">Landlord</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-[#64748b]">Tenant</span>
            </div>
          </div>

          <div>
            {sortedNegotiations.map((entry, idx) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isFirst={idx === 0}
                isLast={idx === sortedNegotiations.length - 1}
                contactIds={contactIds}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LoiNegotiationView({ loiId, callerRole, portalBasePath }: LoiNegotiationViewProps) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [data, setData] = useState<ReviewData | null>(null);
  const [responses, setResponses] = useState<Record<string, SectionResponse>>({});
  const [submittingSection, setSubmittingSection] = useState<string | null>(null);
  const [successSection, setSuccessSection] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/lois/${loiId}/review-data`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFetchError((json as { error?: string }).error ?? 'Failed to load LOI');
        return;
      }
      const json = (await res.json()) as ReviewData;
      setData(json);
      // Initialise per-section response state
      const init: Record<string, SectionResponse> = {};
      json.sections.forEach((s) => {
        init[s.id] = { action: null, counterValue: '', rejectReason: '' };
      });
      setResponses(init);
    } catch {
      setFetchError('Unable to load LOI. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loiId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleAction(id: string, action: SectionAction) {
    setResponses((prev) => ({
      ...prev,
      [id]: { ...prev[id], action: prev[id].action === action ? null : action },
    }));
    setSubmitError(null);
  }

  function handleUpdateField(id: string, field: 'counterValue' | 'rejectReason', value: string) {
    setResponses((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleSectionSubmit(section: LoiSectionData) {
    const r = responses[section.id];
    if (!r?.action) return;

    setSubmittingSection(section.id);
    setSubmitError(null);
    try {
      const payload = {
        responses: [
          {
            sectionId: section.id,
            action: r.action,
            value: r.action === 'counter' ? r.counterValue : undefined,
            note: r.action === 'reject' ? r.rejectReason : undefined,
            updatedAt: section.updatedAt,
          },
        ],
      };

      const res = await fetch(`/api/lois/${loiId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError((json as { error?: string }).error ?? 'Failed to submit response. Please try again.');
        return;
      }

      // Show brief success state then refetch
      setSuccessSection(section.id);
      setTimeout(() => setSuccessSection(null), 3000);

      // Refetch to show updated status
      await loadData();
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSubmittingSection(null);
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#64748b]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading negotiation…</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (fetchError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <h2 className="mt-3 text-base font-semibold text-[#0f172a]">Unable to Load LOI</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {fetchError ?? 'This LOI could not be found or is no longer available.'}
        </p>
      </div>
    );
  }

  const { meta, sections } = data;
  const sorted = [...sections].sort((a, b) => (a.sectionKey < b.sectionKey ? -1 : 1));

  // Compute progress counts
  const statusCounts = sections.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    { proposed: 0, accepted: 0, countered: 0, rejected: 0 } as Record<LoiSectionStatus, number>,
  );
  const total = sections.length;
  const agreed = statusCounts.accepted;
  const progressPercent = total > 0 ? Math.round((agreed / total) * 100) : 0;

  // Suppress unused variable warning for portalBasePath (used for future navigation)
  void portalBasePath;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Left: Main content */}
      <div className="min-w-0 space-y-4">
        {/* LOI header card */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
            Letter of Intent — Negotiation
          </p>
          <h1 className="mt-2 text-xl font-bold text-[#0f172a]">{meta.property}</h1>
          {meta.suite && (
            <p className="mt-0.5 text-[#64748b]">Suite {meta.suite}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#64748b]">
            {meta.tenant && (
              <span>
                Tenant: <span className="font-medium text-[#0f172a]">{meta.tenant}</span>
              </span>
            )}
            {meta.landlord && (
              <span>
                Landlord: <span className="font-medium text-[#0f172a]">{meta.landlord}</span>
              </span>
            )}
            {meta.broker && (
              <span>
                Broker: <span className="font-medium text-[#0f172a]">{meta.broker}</span>
              </span>
            )}
            {meta.sentAt && (
              <span>
                Sent:{' '}
                <span className="font-medium text-[#0f172a]">
                  {new Date(meta.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </span>
            )}
          </div>

          {/* Info banner */}
          <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Review each section and accept, counter, or reject. Each response is submitted individually.
          </div>
        </div>

        {/* Submit error (global) */}
        {submitError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-none text-destructive" />
            <p className="text-sm text-destructive">{submitError}</p>
          </div>
        )}

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
            <FileCheck className="mx-auto h-10 w-10 text-[#64748b]/40" />
            <h2 className="mt-4 text-base font-semibold text-[#0f172a]">No Sections Yet</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              No sections have been added to this LOI yet. Check back later.
            </p>
          </div>
        )}

        {/* Section cards */}
        {sorted.map((section) => {
          const response = responses[section.id] ?? { action: null, counterValue: '', rejectReason: '' };
          return (
            <SectionCard
              key={section.id}
              section={section}
              response={response}
              submittingSection={submittingSection}
              successSection={successSection}
              onAction={handleAction}
              onUpdateField={handleUpdateField}
              onSubmit={handleSectionSubmit}
              contactIds={{
                landlord: data?.meta?.landlordContactId,
                tenant: data?.meta?.tenantContactId,
                broker: data?.meta?.brokerContactId,
              }}
            />
          );
        })}
      </div>

      {/* Right: Sticky sidebar */}
      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        {/* Negotiation Progress */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-[#0f172a]">Negotiation Progress</h3>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[#64748b]">
                <span>{agreed} of {total} sections agreed</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[#64748b]">Accepted</span>
                </span>
                <span className="font-medium text-[#0f172a]">{statusCounts.accepted}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[#64748b]">Countered</span>
                </span>
                <span className="font-medium text-[#0f172a]">{statusCounts.countered}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[#64748b]">Pending</span>
                </span>
                <span className="font-medium text-[#0f172a]">{statusCounts.proposed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[#64748b]">Rejected</span>
                </span>
                <span className="font-medium text-[#0f172a]">{statusCounts.rejected}</span>
              </div>
            </div>

            {/* Party legend */}
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
                Parties
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#1e40af]" />
                  <span className="text-xs text-[#64748b]">Broker</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-[#64748b]">Landlord</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-[#64748b]">Tenant</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Viewing as */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-[#0f172a]">Your Role</h3>
            <p className="mt-2 text-sm capitalize text-[#64748b]">{callerRole.replace(/_/g, ' ')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
