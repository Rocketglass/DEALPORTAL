'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { CommissionInvoice, InvoiceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Mock data (mirrors the invoice detail page)
// ---------------------------------------------------------------------------

const MOCK_INVOICE: CommissionInvoice & {
  property_address: string;
  suite_number: string;
  broker_name: string;
  broker_company: string;
  broker_license: string;
} = {
  id: 'inv-001',
  lease_id: 'lease-001',
  invoice_number: 'RR-07',
  broker_contact_id: 'broker-001',
  payee_contact_id: 'payee-001',
  lease_term_months: 36,
  monthly_rent: 3537.3,
  total_consideration: 127342.8,
  commission_rate_percent: 6,
  commission_amount: 7640.57,
  payee_name: 'RSD Holdings LLC',
  payee_address: '2820 Via Orange Way',
  payee_city_state_zip: 'Spring Valley, CA 91978',
  payment_instructions:
    'Please make checks payable to Rocket Realty and mail to:\n1234 Commercial Blvd, Suite 200\nSan Diego, CA 92101\n\nFor wire transfers, please contact our office for banking details.',
  status: 'sent' as InvoiceStatus,
  sent_date: '2026-03-10T00:00:00Z',
  due_date: '2026-04-15',
  paid_date: null,
  paid_amount: null,
  payment_method: null,
  payment_reference: null,
  pdf_url: null,
  notes: null,
  created_at: '2026-03-10T00:00:00Z',
  updated_at: '2026-03-10T00:00:00Z',
  property_address: '2820 Via Orange Way',
  suite_number: 'Suite A',
  broker_name: 'Rocket Glass, CCIM',
  broker_company: 'Rocket Realty',
  broker_license: 'DRE #01234567',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Print Invoice Page
// ---------------------------------------------------------------------------

export default function InvoicePrintPage() {
  const invoice = MOCK_INVOICE;

  useEffect(() => {
    // Small delay to ensure the page is fully rendered before triggering print
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
        {/* Print button — hidden when printing */}
        <div className="no-print mb-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}>
            &larr; Back
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print Invoice
          </Button>
        </div>

        {/* Invoice header */}
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
              COMMISSION INVOICE
            </h2>
            <p className="mt-1 text-sm font-medium text-[#64748b]">
              #{invoice.invoice_number}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="mb-8 flex gap-12 text-sm">
          <div>
            <span className="text-[#64748b]">Invoice Date:</span>{' '}
            <span className="font-medium text-[#0f172a]">
              {formatDate(invoice.created_at)}
            </span>
          </div>
          {invoice.due_date && (
            <div>
              <span className="text-[#64748b]">Due Date:</span>{' '}
              <span className="font-medium text-[#0f172a]">
                {formatDate(invoice.due_date)}
              </span>
            </div>
          )}
        </div>

        {/* From / To */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              From
            </p>
            <p className="font-medium text-[#0f172a]">{invoice.broker_name}</p>
            <p className="text-sm text-[#64748b]">{invoice.broker_company}</p>
            <p className="text-sm text-[#64748b]">{invoice.broker_license}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Bill To
            </p>
            <p className="font-medium text-[#0f172a]">{invoice.payee_name}</p>
            <p className="text-sm text-[#64748b]">{invoice.payee_address}</p>
            <p className="text-sm text-[#64748b]">
              {invoice.payee_city_state_zip}
            </p>
          </div>
        </div>

        {/* Line items table */}
        <table className="mb-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#e2e8f0]">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Description
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Details
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e2e8f0]">
              <td className="py-3 font-medium text-[#0f172a]">Property</td>
              <td className="py-3 text-right text-[#64748b]">
                {invoice.property_address}, {invoice.suite_number}
              </td>
              <td className="py-3 text-right text-[#64748b]" />
            </tr>
            <tr className="border-b border-[#e2e8f0]">
              <td className="py-3 font-medium text-[#0f172a]">Lease Term</td>
              <td className="py-3 text-right text-[#64748b]">
                {invoice.lease_term_months} months
              </td>
              <td className="py-3 text-right text-[#64748b]" />
            </tr>
            <tr className="border-b border-[#e2e8f0]">
              <td className="py-3 font-medium text-[#0f172a]">Monthly Rent</td>
              <td className="py-3 text-right text-[#64748b]">
                {formatCurrency(invoice.monthly_rent)} /mo
              </td>
              <td className="py-3 text-right text-[#64748b]" />
            </tr>
            <tr className="border-b border-[#e2e8f0]">
              <td className="py-3 font-medium text-[#0f172a]">
                Total Consideration
              </td>
              <td className="py-3 text-right text-[#64748b]">
                {formatCurrency(invoice.monthly_rent)} x{' '}
                {invoice.lease_term_months} mo
              </td>
              <td className="py-3 text-right font-medium text-[#0f172a]">
                {formatCurrency(invoice.total_consideration)}
              </td>
            </tr>
            <tr className="border-b border-[#e2e8f0]">
              <td className="py-3 font-medium text-[#0f172a]">
                Commission Rate
              </td>
              <td className="py-3 text-right text-[#64748b]">
                {invoice.commission_rate_percent}%
              </td>
              <td className="py-3 text-right text-[#64748b]" />
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#0f172a]">
              <td
                colSpan={2}
                className="py-4 text-right text-sm font-bold uppercase tracking-wider text-[#0f172a]"
              >
                Commission Due
              </td>
              <td className="py-4 text-right text-lg font-bold text-[#1e40af]">
                {formatCurrency(invoice.commission_amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment instructions */}
        {invoice.payment_instructions && (
          <div className="rounded-lg border border-[#e2e8f0] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Payment Instructions
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#0f172a]">
              {invoice.payment_instructions}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-[#e2e8f0] pt-4 text-center text-xs text-[#64748b]">
          <p>Rocket Realty &middot; Commercial Real Estate Brokerage</p>
          <p className="mt-0.5">
            Thank you for your business.
          </p>
        </div>
      </div>
    </>
  );
}
