'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDocumentDate } from '@/lib/utils';
import type { EnrichedInvoice } from '../types';

/**
 * Commission Statement print layout — matches Rocket's original format:
 *
 * Commission Statement
 * INVOICE NUMBER: RR #82
 * DATE: April 29, 2025
 * LESSOR: ...
 * LESSEE: ...
 * PREMISES: ...
 * TERM: X months
 *
 * [Rent Escalation Schedule Table]
 * Month 1-12:   $X/mo × N = $Y
 * Month 13-24:  $X/mo × N = $Y
 * ...
 *
 * TOTAL CONSIDERATION: $X
 * COMMISSION RATE: X%
 * TOTAL COMMISSION DUE: $X
 * Please make checks payable to: ...
 */

interface InvoicePrintClientProps {
  invoice: EnrichedInvoice;
}

export default function InvoicePrintClient({ invoice }: InvoicePrintClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const escalations = invoice.escalations ?? [];
  const hasEscalations = escalations.length > 0;

  // Build escalation schedule rows for display
  // Each row: "Month X – Month Y", monthly rate, # of months, annual total
  const scheduleRows: {
    label: string;
    monthly: number;
    months: number;
    annual: number;
  }[] = [];

  if (hasEscalations) {
    let monthStart = 1;
    for (let i = 0; i < escalations.length; i++) {
      const esc = escalations[i];
      const nextEsc = escalations[i + 1];
      // Determine how many months this rate covers
      let monthsAtRate: number;
      if (nextEsc) {
        // Duration until next escalation
        const startDate = new Date(esc.effective_date);
        const endDate = new Date(nextEsc.effective_date);
        monthsAtRate = Math.round(
          (endDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000),
        );
        if (monthsAtRate < 1) monthsAtRate = 12;
      } else {
        // Last escalation — fill to end of term
        const remaining = (invoice.lease_term_months ?? 0) - monthStart + 1;
        monthsAtRate = remaining > 0 ? remaining : 12;
      }

      const monthEnd = monthStart + monthsAtRate - 1;
      const label =
        monthsAtRate === 1
          ? `Month ${monthStart}`
          : `Month ${monthStart} – Month ${monthEnd}`;

      scheduleRows.push({
        label,
        monthly: esc.monthly_amount,
        months: monthsAtRate,
        annual: esc.monthly_amount * monthsAtRate,
      });

      monthStart = monthEnd + 1;
    }
  }

  return (
    <>
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
        {/* Print button — hidden when printing */}
        <div className="no-print mb-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}>
            &larr; Back
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print Invoice
          </Button>
        </div>

        {/* === COMMISSION STATEMENT HEADER === */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-wide text-[#0f172a]">
            Commission Statement
          </h1>
        </div>

        {/* Invoice metadata */}
        <div className="mb-8 space-y-2 text-[15px]">
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">INVOICE NUMBER:</span>
            <span className="text-[#0f172a]">{invoice.invoice_number}</span>
          </div>
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">DATE:</span>
            <span className="text-[#0f172a]">{formatDocumentDate(invoice.created_at)}</span>
          </div>
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">LESSOR:</span>
            <span className="text-[#0f172a]">{invoice.lessor_name || invoice.payee_name}</span>
          </div>
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">LESSEE:</span>
            <span className="text-[#0f172a]">{invoice.lessee_name || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">PREMISES:</span>
            <span className="text-[#0f172a]">{invoice.premises_full || invoice.property_address}</span>
          </div>
          <div className="flex">
            <span className="w-48 font-semibold text-[#0f172a]">TERM:</span>
            <span className="text-[#0f172a]">{invoice.lease_term_months} months</span>
          </div>
        </div>

        {/* === RENT ESCALATION SCHEDULE === */}
        {hasEscalations && (
          <div className="mb-8">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b-2 border-[#0f172a]">
                  <th className="pb-2 text-left font-semibold text-[#0f172a]">
                    {invoice.premises_full || invoice.property_address}
                  </th>
                  <th />
                  <th />
                  <th />
                </tr>
                <tr className="border-b border-[#cbd5e1]">
                  <th className="py-2 text-left font-medium text-[#64748b]">Term</th>
                  <th className="py-2 text-right font-medium text-[#64748b]">Monthly</th>
                  <th className="py-2 text-right font-medium text-[#64748b]"># of Months</th>
                  <th className="py-2 text-right font-medium text-[#64748b]">Annual</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0]">
                    <td className="py-2 text-[#0f172a]">{row.label}</td>
                    <td className="py-2 text-right text-[#0f172a]">
                      {formatCurrency(row.monthly)}
                    </td>
                    <td className="py-2 text-right text-[#0f172a]">{row.months}</td>
                    <td className="py-2 text-right text-[#0f172a]">
                      {formatCurrency(row.annual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === TOTALS === */}
        <div className="mb-10 space-y-3 text-[15px]">
          <div className="flex border-t-2 border-[#0f172a] pt-4">
            <span className="w-64 font-bold text-[#0f172a]">TOTAL CONSIDERATION:</span>
            <span className="font-bold text-[#0f172a]">
              {formatCurrency(Number(invoice.total_consideration))}
            </span>
          </div>
          <div className="flex">
            <span className="w-64 font-bold text-[#0f172a]">COMMISSION RATE:</span>
            <span className="font-bold text-[#0f172a]">
              {invoice.commission_rate_percent}%
            </span>
          </div>
          <div className="flex border-t border-[#cbd5e1] pt-3">
            <span className="w-64 text-lg font-bold text-[#0f172a]">TOTAL COMMISSION DUE:</span>
            <span className="text-lg font-bold text-[#0f172a]">
              {formatCurrency(Number(invoice.commission_amount))}
            </span>
          </div>
        </div>

        {/* === PAYMENT INSTRUCTIONS === */}
        <div className="text-[15px] text-[#0f172a]">
          {invoice.payment_instructions ? (
            <p className="whitespace-pre-line">{invoice.payment_instructions}</p>
          ) : (
            <p>
              Please make checks payable to: <strong>Rocket Realty</strong>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-[#e2e8f0] pt-4 text-center text-xs text-[#64748b]">
          <p>Rocket Realty &middot; Commercial Real Estate Brokerage &middot; San Diego, CA</p>
        </div>
      </div>
    </>
  );
}
