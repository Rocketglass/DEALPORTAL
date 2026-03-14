'use client';

import { useState } from 'react';
import {
  Download,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Circle,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CommissionInvoice, InvoiceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Mock data
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
  status: 'draft' as InvoiceStatus,
  sent_date: null,
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
// Progress tracker
// ---------------------------------------------------------------------------

const STAGES: { key: InvoiceStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
];

function stageIndex(status: InvoiceStatus) {
  if (status === 'overdue') return 1; // still in "sent" stage
  if (status === 'cancelled') return -1;
  return STAGES.findIndex((s) => s.key === status);
}

function PaymentProgress({ status }: { status: InvoiceStatus }) {
  const current = stageIndex(status);

  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, idx) => {
        const isComplete = idx < current;
        const isCurrent = idx === current;

        return (
          <div key={stage.key} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'h-0.5 w-16',
                  isComplete ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]',
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  isComplete && 'bg-[#16a34a] text-white',
                  isCurrent && 'border-2 border-[#1e40af] bg-white text-[#1e40af]',
                  !isComplete && !isCurrent && 'border-2 border-[#e2e8f0] bg-white text-[#64748b]',
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isComplete && 'text-[#16a34a]',
                  isCurrent && 'text-[#0f172a]',
                  !isComplete && !isCurrent && 'text-[#64748b]',
                )}
              >
                {stage.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState(MOCK_INVOICE);

  const handleSendToLandlord = () => {
    setInvoice((prev) => ({
      ...prev,
      status: 'sent' as InvoiceStatus,
      sent_date: new Date().toISOString(),
    }));
  };

  const handleMarkAsPaid = () => {
    setInvoice((prev) => ({
      ...prev,
      status: 'paid' as InvoiceStatus,
      paid_date: new Date().toISOString(),
      paid_amount: prev.commission_amount,
      payment_method: 'check',
      payment_reference: 'CHK-4821',
    }));
  };

  const handleDownloadPdf = async () => {
    const { generateInvoicePdf } = await import('@/lib/pdf/invoice');
    const pdfBytes = await generateInvoicePdf(invoice);
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoice.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <BackButton href="/invoices" label="Back to Invoices" className="mb-6" />

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f5f9]">
            <FileText className="h-5 w-5 text-[#1e40af]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0f172a]">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-sm text-[#64748b]">
              Created {formatDate(invoice.created_at)}
            </p>
          </div>
          <Badge status={invoice.status} dot />
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Button variant="primary" icon={Send} onClick={handleSendToLandlord}>
              Send to Landlord
            </Button>
          )}
          <Button variant="secondary" icon={Download} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
          {invoice.status === 'sent' && (
            <Button variant="secondary" icon={CreditCard} onClick={handleMarkAsPaid}>
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Invoice preview card */}
      <Card border className="mb-8 overflow-hidden">
        {/* Invoice header band */}
        <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#1e40af]">
                ROCKET REALTY
              </h2>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Commercial Real Estate Brokerage
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-[#0f172a]">
                COMMISSION INVOICE
              </h3>
              <p className="mt-1 text-sm font-medium text-[#64748b]">
                #{invoice.invoice_number}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="px-8 py-6">
          {/* Date row */}
          <div className="mb-8 flex flex-wrap gap-x-12 gap-y-2 text-sm">
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
          <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
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
              <p className="font-medium text-[#0f172a]">
                {invoice.payee_name}
              </p>
              <p className="text-sm text-[#64748b]">
                {invoice.payee_address}
              </p>
              <p className="text-sm text-[#64748b]">
                {invoice.payee_city_state_zip}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <div className="mb-8 overflow-hidden rounded-lg border border-[#e2e8f0]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Details
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                <tr>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">
                    Property
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {invoice.property_address}, {invoice.suite_number}
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]" />
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">
                    Lease Term
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {invoice.lease_term_months} months
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]" />
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">
                    Monthly Rent
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {formatCurrency(invoice.monthly_rent)} /mo
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]" />
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">
                    Total Consideration
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {formatCurrency(invoice.monthly_rent)} x{' '}
                    {invoice.lease_term_months} mo
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#0f172a]">
                    {formatCurrency(invoice.total_consideration)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#0f172a]">
                    Commission Rate
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]">
                    {invoice.commission_rate_percent}%
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748b]" />
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#f8fafc]">
                  <td
                    colSpan={2}
                    className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider text-[#0f172a]"
                  >
                    Commission Due
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-[#1e40af]">
                    {formatCurrency(invoice.commission_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment instructions */}
          {invoice.payment_instructions && (
            <div className="rounded-lg bg-[#f8fafc] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Payment Instructions
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#0f172a]">
                {invoice.payment_instructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment tracking section */}
      <Card border>
        <CardContent className="p-6">
          <h3 className="mb-5 text-sm font-semibold text-[#0f172a]">
            Payment Tracking
          </h3>

          <div className="mb-6 flex justify-center">
            <PaymentProgress status={invoice.status} />
          </div>

          {invoice.status === 'paid' && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-green-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-[#64748b]">Payment Date</p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {invoice.paid_date ? formatDate(invoice.paid_date) : '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b]">Method</p>
                <p className="mt-0.5 text-sm font-medium capitalize text-[#0f172a]">
                  {invoice.payment_method ?? '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b]">
                  Reference Number
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {invoice.payment_reference ?? '\u2014'}
                </p>
              </div>
            </div>
          )}

          {invoice.status === 'draft' && (
            <p className="mt-2 text-center text-sm text-[#64748b]">
              This invoice has not been sent yet. Click &quot;Send to Landlord&quot; to email it.
            </p>
          )}

          {invoice.status === 'sent' && (
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Invoice sent on{' '}
              {invoice.sent_date ? formatDate(invoice.sent_date) : '\u2014'}.
              Awaiting payment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
