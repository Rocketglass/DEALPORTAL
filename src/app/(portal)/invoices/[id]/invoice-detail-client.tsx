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
  X,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { InvoiceStatus } from '@/types/database';
import type { EnrichedInvoice } from './types';

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
// Payment details form (shown when marking as paid)
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'other', label: 'Other' },
];

interface PaymentFormData {
  payment_method: string;
  payment_reference: string;
  paid_amount: string;
  paid_date: string;
}

function PaymentDetailsForm({
  defaultAmount,
  onSubmit,
  onCancel,
  loading,
}: {
  defaultAmount: number;
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<PaymentFormData>({
    payment_method: 'check',
    payment_reference: '',
    paid_amount: defaultAmount.toFixed(2),
    paid_date: new Date().toISOString().split('T')[0],
  });

  function updateField(field: keyof PaymentFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Record payment details" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md mx-4 rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#0f172a]">Record Payment</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Enter the payment details to mark this invoice as paid
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close payment form"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-4">
          <Select
            label="Payment Method"
            required
            value={form.payment_method}
            onChange={(e) => updateField('payment_method', e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <Input
            label="Payment Reference"
            placeholder={
              form.payment_method === 'check'
                ? 'Check number'
                : form.payment_method === 'wire'
                  ? 'Wire reference number'
                  : form.payment_method === 'ach'
                    ? 'ACH transaction ID'
                    : 'Reference number'
            }
            value={form.payment_reference}
            onChange={(e) => updateField('payment_reference', e.target.value)}
            hint="Check number, wire reference, or transaction ID"
          />

          <Input
            label="Payment Amount"
            type="number"
            required
            min={0}
            step="0.01"
            value={form.paid_amount}
            onChange={(e) => updateField('paid_amount', e.target.value)}
          />

          <Input
            label="Payment Date"
            type="date"
            required
            value={form.paid_date}
            onChange={(e) => updateField('paid_date', e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#e2e8f0] px-6 py-4">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={CheckCircle2}
            className="flex-1"
            onClick={() => onSubmit(form)}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment method label helper
// ---------------------------------------------------------------------------

function formatPaymentMethod(method: string | null): string {
  if (!method) return '\u2014';
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found ? found.label : method;
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface InvoiceDetailClientProps {
  initialInvoice: EnrichedInvoice;
}

export default function InvoiceDetailClient({
  initialInvoice,
}: InvoiceDetailClientProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // ---- Status actions ----------------------------------------------------

  const handleSendToLandlord = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      if (res.ok) {
        const json = await res.json();
        setInvoice((prev) => ({ ...prev, ...json.invoice }));
      }
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsPaid = async (formData: PaymentFormData) => {
    setMarking(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paid_amount: parseFloat(formData.paid_amount) || invoice.commission_amount,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference || null,
          paid_date: formData.paid_date,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setInvoice((prev) => ({ ...prev, ...json.invoice }));
        setShowPaymentForm(false);
      }
    } finally {
      setMarking(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
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
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSendToLandlord}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send to Landlord'}
            </Button>
          )}
          <Button variant="secondary" icon={Download} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
          {invoice.status === 'sent' && (
            <Button
              variant="secondary"
              icon={CreditCard}
              onClick={() => setShowPaymentForm(true)}
              disabled={marking}
            >
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
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]"
                  >
                    Details
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b]"
                  >
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
                    {invoice.property_address}
                    {invoice.suite_number ? `, ${invoice.suite_number}` : ''}
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
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-green-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-[#64748b]">Payment Date</p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {invoice.paid_date ? formatDate(invoice.paid_date) : '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b]">Method</p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {formatPaymentMethod(invoice.payment_method)}
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
              <div>
                <p className="text-xs font-medium text-[#64748b]">Amount Paid</p>
                <p className="mt-0.5 text-sm font-bold text-green-700">
                  {invoice.paid_amount != null
                    ? formatCurrency(invoice.paid_amount)
                    : '\u2014'}
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

      {/* Payment Details Modal */}
      {showPaymentForm && (
        <PaymentDetailsForm
          defaultAmount={invoice.commission_amount}
          onSubmit={handleMarkAsPaid}
          onCancel={() => setShowPaymentForm(false)}
          loading={marking}
        />
      )}
    </div>
  );
}
