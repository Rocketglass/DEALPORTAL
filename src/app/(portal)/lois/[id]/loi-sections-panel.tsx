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
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ArrowRightLeft,
  History,
  User,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LoiSection, LoiSectionKey, LoiSectionStatus, NegotiationAction } from '@/types/database';

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

// ---------------------------------------------------------------------------
// Timeline action config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<NegotiationAction, { label: string; icon: React.ElementType; badgeStatus: string }> = {
  propose: { label: 'Proposed', icon: Clock, badgeStatus: 'proposed' },
  counter: { label: 'Countered', icon: ArrowRightLeft, badgeStatus: 'countered' },
  accept: { label: 'Accepted', icon: CheckCircle2, badgeStatus: 'accepted' },
  reject: { label: 'Rejected', icon: XCircle, badgeStatus: 'rejected' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine if an actor is broker or landlord based on the created_by string. */
function actorRole(createdBy: string): 'broker' | 'landlord' {
  const lower = createdBy.toLowerCase();
  if (lower.includes('landlord') || lower.includes('owner') || lower.includes('lessor')) {
    return 'landlord';
  }
  return 'broker';
}

function formatTimelineDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimelineTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NegotiationEntry {
  id: string;
  action: string;
  value: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

interface LoiSectionWithNegotiations extends LoiSection {
  negotiations?: NegotiationEntry[];
}

interface Props {
  sections: LoiSectionWithNegotiations[];
}

// ---------------------------------------------------------------------------
// Timeline Entry Component
// ---------------------------------------------------------------------------

function TimelineEntry({
  entry,
  isFirst,
  isLast,
}: {
  entry: NegotiationEntry;
  isFirst: boolean;
  isLast: boolean;
}) {
  const role = actorRole(entry.created_by);
  const actionKey = entry.action as NegotiationAction;
  const config = ACTION_CONFIG[actionKey] ?? ACTION_CONFIG.propose;

  const isBroker = role === 'broker';
  const dotColor = isBroker ? 'bg-[#1e40af]' : 'bg-amber-500';
  const ringColor = isBroker ? 'ring-blue-100' : 'ring-amber-100';
  const labelColor = isBroker ? 'text-[#1e40af]' : 'text-amber-700';
  const RoleIcon = isBroker ? User : Building2;

  return (
    <div className="relative flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        {/* Top connector line */}
        <div
          className={cn(
            'w-px flex-none',
            isFirst ? 'h-3 bg-transparent' : 'h-3 bg-slate-200',
          )}
        />
        {/* Dot */}
        <div
          className={cn(
            'relative z-10 flex h-3 w-3 flex-none items-center justify-center rounded-full ring-4',
            dotColor,
            ringColor,
          )}
        />
        {/* Bottom connector line */}
        <div
          className={cn(
            'w-px flex-1',
            isLast ? 'bg-transparent' : 'bg-slate-200',
          )}
        />
      </div>

      {/* Content card */}
      <div className={cn('mb-3 flex-1 rounded-lg border p-3', isLast ? 'mb-0' : '')}>
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RoleIcon className={cn('h-3.5 w-3.5', labelColor)} />
            <span className={cn('text-xs font-semibold', labelColor)}>
              {entry.created_by}
            </span>
            <Badge status={config.badgeStatus} size="sm" />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#64748b]">
            <Clock className="h-3 w-3" />
            <span>{formatTimelineDate(entry.created_at)}</span>
            <span className="text-slate-300">&middot;</span>
            <span>{formatTimelineTime(entry.created_at)}</span>
          </div>
        </div>

        {/* Value */}
        {entry.value && (
          <div className="mt-2 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-[#64748b]">Proposed Value</p>
            <p className="mt-0.5 text-sm font-medium text-[#0f172a]">{entry.value}</p>
          </div>
        )}

        {/* Note */}
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
// Main Panel
// ---------------------------------------------------------------------------

export function LoiSectionsPanel({ sections }: Props) {
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  function toggleHistory(id: string) {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sorted = [...sections].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-3">
      {sorted.map((section) => {
        const Icon = SECTION_ICONS[section.section_key] ?? FileCheck;
        const statusCfg = sectionStatusConfig[section.status];
        const StatusIcon = statusCfg.icon;
        const historyOpen = expandedHistory.has(section.id);
        const negotiations = section.negotiations ?? [];

        // Sort chronologically (oldest first)
        const sortedNegotiations = [...negotiations].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        // Latest negotiation for the collapsed summary
        const latest = sortedNegotiations[sortedNegotiations.length - 1];

        return (
          <Card key={section.id}>
            <div className="px-5 py-4">
              {/* Section header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-[#64748b]" />
                  </div>
                  <span className="text-sm font-semibold text-[#0f172a]">{section.section_label}</span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusCfg.bg,
                    statusCfg.text,
                  )}
                  aria-label={`Status: ${statusCfg.label}`}
                >
                  <StatusIcon className="h-3 w-3" aria-hidden="true" />
                  {statusCfg.label}
                </span>
              </div>

              {/* Values */}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-[#64748b]">Proposed</p>
                  <p className="mt-0.5 text-sm text-[#0f172a]">{section.proposed_value}</p>
                </div>
                {section.landlord_response && (
                  <div>
                    <p className="text-xs font-medium text-[#64748b]">Landlord Response</p>
                    <p className="mt-0.5 text-sm text-[#0f172a]">{section.landlord_response}</p>
                  </div>
                )}
                {section.agreed_value && (
                  <div>
                    <p className="text-xs font-medium text-[#64748b]">Agreed</p>
                    <p className="mt-0.5 text-sm font-medium text-green-700">{section.agreed_value}</p>
                  </div>
                )}
              </div>

              {/* Latest activity summary (collapsed state) */}
              {latest && !historyOpen && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      actorRole(latest.created_by) === 'broker' ? 'bg-[#1e40af]' : 'bg-amber-500',
                    )}
                  />
                  <span className="text-xs text-[#64748b]">
                    Latest: <span className="font-medium text-[#0f172a]">{latest.created_by}</span>
                    {' '}{ACTION_CONFIG[latest.action as NegotiationAction]?.label.toLowerCase() ?? latest.action}
                    {latest.value ? ` — ${latest.value}` : ''}
                    <span className="ml-1.5 text-slate-400">{formatTimelineDate(latest.created_at)}</span>
                  </span>
                </div>
              )}

              {/* History toggle */}
              {negotiations.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleHistory(section.id)}
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
                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      View History ({negotiations.length} {negotiations.length === 1 ? 'entry' : 'entries'})
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
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
                    Counter-Offer Timeline
                  </h4>
                </div>

                {/* Legend */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#1e40af]" />
                    <span className="text-[11px] font-medium text-[#64748b]">Broker</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-medium text-[#64748b]">Landlord</span>
                  </div>
                </div>

                {/* Timeline entries */}
                <div>
                  {sortedNegotiations.map((entry, idx) => (
                    <TimelineEntry
                      key={entry.id}
                      entry={entry}
                      isFirst={idx === 0}
                      isLast={idx === sortedNegotiations.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
