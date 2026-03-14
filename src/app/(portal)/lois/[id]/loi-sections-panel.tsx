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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { LoiSection, LoiSectionKey, LoiSectionStatus } from '@/types/database';

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

interface LoiSectionWithNegotiations extends LoiSection {
  negotiations?: {
    id: string;
    action: string;
    value: string | null;
    note: string | null;
    created_by: string;
    created_at: string;
  }[];
}

interface Props {
  sections: LoiSectionWithNegotiations[];
}

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

        return (
          <Card key={section.id}>
            <div className="px-5 py-4">
              {/* Section header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{section.section_label}</span>
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
                  <p className="text-xs font-medium text-muted-foreground">Proposed</p>
                  <p className="mt-0.5 text-sm">{section.proposed_value}</p>
                </div>
                {section.landlord_response && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Landlord Response</p>
                    <p className="mt-0.5 text-sm">{section.landlord_response}</p>
                  </div>
                )}
                {section.agreed_value && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Agreed</p>
                    <p className="mt-0.5 text-sm font-medium text-green-700">{section.agreed_value}</p>
                  </div>
                )}
              </div>

              {/* History toggle */}
              {negotiations.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleHistory(section.id)}
                  aria-expanded={historyOpen}
                  aria-controls={`history-${section.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {historyOpen ? (
                    <ChevronUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  Negotiation History ({negotiations.length})
                </button>
              )}
            </div>

            {/* Expanded history */}
            {historyOpen && negotiations.length > 0 && (
              <div
                id={`history-${section.id}`}
                className="border-t border-border px-5 pb-4 pt-3"
              >
                <div className="space-y-2">
                  {negotiations.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                      <div>
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-muted-foreground">
                          {' '}by {entry.created_by}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}&middot; {entry.created_at.slice(0, 10)}
                        </span>
                        {entry.value && (
                          <p className="mt-0.5 text-muted-foreground">{entry.value}</p>
                        )}
                        {entry.note && (
                          <p className="mt-0.5 italic text-muted-foreground">{entry.note}</p>
                        )}
                      </div>
                    </div>
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
