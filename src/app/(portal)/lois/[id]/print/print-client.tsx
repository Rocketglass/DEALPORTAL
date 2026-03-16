'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDocumentDate } from '@/lib/utils';
import type { Contact, LoiSectionStatus, LoiWithRelations } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contactName(contact: Contact | null): string {
  if (!contact) return '\u2014';
  if (contact.company_name) return contact.company_name;
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || '\u2014';
}

const statusColor: Record<LoiSectionStatus, string> = {
  accepted: 'text-green-600',
  countered: 'text-amber-600',
  rejected: 'text-red-600',
  proposed: 'text-blue-600',
};

const statusLabel: Record<LoiSectionStatus, string> = {
  accepted: 'Accepted',
  countered: 'Countered',
  rejected: 'Rejected',
  proposed: 'Proposed',
};

// ---------------------------------------------------------------------------
// Print client component
// ---------------------------------------------------------------------------

interface LoiPrintClientProps {
  loi: LoiWithRelations;
}

export default function LoiPrintClient({ loi }: LoiPrintClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const sections = [...(loi.sections ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl bg-white px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {/* Action bar — hidden when printing */}
        <div className="no-print mb-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}>
            &larr; Back
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print LOI
          </Button>
        </div>

        {/* Header with blue branding bar */}
        <div className="mb-8 flex items-start justify-between border-b-2 border-[#1e40af] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1e40af]">
              ROCKET REALTY
            </h1>
            <p className="mt-0.5 text-sm text-[#64748b]">
              Commercial Real Estate Brokerage
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-[#0f172a]">
              LETTER OF INTENT
            </h2>
            <p className="mt-1 text-sm font-medium text-[#64748b]">
              Version {loi.version}
            </p>
          </div>
        </div>

        {/* LOI metadata */}
        <div className="mb-8 flex flex-wrap gap-x-12 gap-y-2 text-sm">
          <div>
            <span className="text-[#64748b]">Property:</span>{' '}
            <span className="font-medium text-[#0f172a]">
              {loi.property?.name ?? '\u2014'}
            </span>
          </div>
          {loi.unit?.suite_number && (
            <div>
              <span className="text-[#64748b]">Suite:</span>{' '}
              <span className="font-medium text-[#0f172a]">
                {loi.unit.suite_number}
              </span>
            </div>
          )}
          <div>
            <span className="text-[#64748b]">Date:</span>{' '}
            <span className="font-medium text-[#0f172a]">
              {formatDocumentDate(loi.created_at)}
            </span>
          </div>
          {loi.sent_at && (
            <div>
              <span className="text-[#64748b]">Sent:</span>{' '}
              <span className="font-medium text-[#0f172a]">
                {formatDocumentDate(loi.sent_at)}
              </span>
            </div>
          )}
          <div>
            <span className="text-[#64748b]">Status:</span>{' '}
            <span className="font-medium capitalize text-[#0f172a]">
              {loi.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Property address */}
        {loi.property && (
          <div className="mb-8 text-sm text-[#64748b]">
            {loi.property.address}, {loi.property.city}, {loi.property.state}
          </div>
        )}

        {/* Parties */}
        <div className="mb-8 grid grid-cols-3 gap-8">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Tenant
            </p>
            <p className="font-medium text-[#0f172a]">
              {contactName(loi.tenant)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Landlord
            </p>
            <p className="font-medium text-[#0f172a]">
              {contactName(loi.landlord)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Broker
            </p>
            <p className="font-medium text-[#0f172a]">
              {contactName(loi.broker)}
            </p>
          </div>
        </div>

        {/* Sections table */}
        <table className="mb-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#e2e8f0]">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Section
              </th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-b border-[#e2e8f0]">
                <td className="py-3 pr-4 font-medium text-[#0f172a]">
                  {section.section_label}
                </td>
                <td className="py-3">
                  {section.agreed_value ? (
                    <div>
                      <span className="font-medium text-[#0f172a]">
                        {section.agreed_value}
                      </span>
                      <span className="ml-2 text-xs font-medium text-green-600">
                        Agreed
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[#0f172a]">
                        {section.proposed_value}
                      </span>
                      <span
                        className={`ml-2 text-xs font-medium ${statusColor[section.status]}`}
                      >
                        {statusLabel[section.status]}
                      </span>
                      {section.landlord_response && (
                        <div className="mt-1 text-xs text-[#64748b]">
                          Counter: {section.landlord_response}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        {loi.notes && (
          <div className="mb-8 rounded-lg border border-[#e2e8f0] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Notes
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#0f172a]">
              {loi.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-[#e2e8f0] pt-4 text-center text-xs text-[#64748b]">
          <p>Rocket Realty &middot; Commercial Real Estate Brokerage</p>
        </div>
      </div>
    </>
  );
}
