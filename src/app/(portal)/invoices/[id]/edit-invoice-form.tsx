'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { EnrichedInvoice } from './types';

type SplitType = 'full' | 'split';

interface EditFormState {
  invoice_number: string;
  payee_name: string;
  payee_address: string;
  payee_city_state_zip: string;
  property_address: string;
  suite_number: string;
  suite_sf: string;
  lessee_name: string;
  lease_term_months: string;
  monthly_rent: string;
  total_consideration: string;
  commission_rate_percent: string;
  due_date: string;
  notes: string;
  split_type: SplitType;
  split_percent: string;
  split_with_agent: string;
}

function fromInvoice(invoice: EnrichedInvoice): EditFormState {
  return {
    invoice_number: invoice.invoice_number ?? '',
    payee_name: invoice.payee_name ?? '',
    payee_address: invoice.payee_address ?? '',
    payee_city_state_zip: invoice.payee_city_state_zip ?? '',
    property_address:
      invoice.property_address || invoice.premises_full || '',
    suite_number: invoice.suite_number?.replace(/^Suite\s+/, '') ?? '',
    suite_sf: invoice.suite_sf ? String(invoice.suite_sf) : '',
    lessee_name: invoice.lessee_name ?? '',
    lease_term_months: String(invoice.lease_term_months ?? ''),
    monthly_rent: String(invoice.monthly_rent ?? ''),
    total_consideration: String(invoice.total_consideration ?? ''),
    commission_rate_percent: String(invoice.commission_rate_percent ?? ''),
    due_date: invoice.due_date ?? '',
    notes: invoice.notes ?? '',
    split_type: invoice.commission_split_percent < 100 ? 'split' : 'full',
    split_percent: String(invoice.commission_split_percent ?? 100),
    split_with_agent: invoice.split_with_agent ?? '',
  };
}

interface EditInvoiceFormProps {
  invoice: EnrichedInvoice;
  onCancel: () => void;
  onSaved: (updated: EnrichedInvoice) => void;
}

export default function EditInvoiceForm({
  invoice,
  onCancel,
  onSaved,
}: EditInvoiceFormProps) {
  const [form, setForm] = useState<EditFormState>(() => fromInvoice(invoice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Live-compute the derived commission amount for the preview
  const derivedCommission = (() => {
    const rate = parseFloat(form.commission_rate_percent);
    const total = parseFloat(form.total_consideration);
    const split = form.split_type === 'split' ? parseFloat(form.split_percent) : 100;
    if (
      Number.isFinite(rate) && rate > 0 &&
      Number.isFinite(total) && total > 0 &&
      Number.isFinite(split) && split > 0
    ) {
      return Math.round(total * (rate / 100) * (split / 100) * 100) / 100;
    }
    return null;
  })();

  async function handleSave() {
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {};

    // Invoice number — only send if changed (avoids unnecessary uniqueness check)
    if (form.invoice_number.trim() && form.invoice_number.trim() !== invoice.invoice_number) {
      payload.invoice_number = form.invoice_number.trim();
    }

    // Text fields (empty string → null)
    payload.payee_name = form.payee_name.trim() || null;
    payload.payee_address = form.payee_address.trim() || null;
    payload.payee_city_state_zip = form.payee_city_state_zip.trim() || null;
    payload.property_address = form.property_address.trim() || null;
    payload.suite_number = form.suite_number.trim() || null;
    payload.lessee_name = form.lessee_name.trim() || null;
    if (form.suite_sf.trim()) {
      const sf = parseInt(form.suite_sf, 10);
      if (Number.isFinite(sf) && sf >= 0) {
        payload.suite_sf = sf;
      }
    } else {
      payload.suite_sf = null;
    }
    payload.notes = form.notes.trim() || null;

    // Numerics
    const numericMap = {
      lease_term_months: form.lease_term_months,
      monthly_rent: form.monthly_rent,
      total_consideration: form.total_consideration,
      commission_rate_percent: form.commission_rate_percent,
    };
    for (const [k, v] of Object.entries(numericMap)) {
      if (v.trim()) {
        const n = parseFloat(v);
        if (!Number.isFinite(n) || n < 0) {
          setError(`${k} must be a valid number`);
          setSaving(false);
          return;
        }
        payload[k] = k === 'lease_term_months' ? Math.round(n) : n;
      }
    }

    // Derived commission_amount + split
    if (derivedCommission !== null) {
      payload.commission_amount = derivedCommission;
    }
    if (form.split_type === 'split') {
      const pct = parseFloat(form.split_percent);
      if (Number.isFinite(pct) && pct >= 1 && pct <= 99) {
        payload.commission_split_percent = pct;
      }
      payload.split_with_agent = form.split_with_agent.trim() || null;
    } else {
      payload.commission_split_percent = 100;
      payload.split_with_agent = null;
    }

    // Due date
    if (form.due_date) payload.due_date = form.due_date;

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save invoice');
        return;
      }
      onSaved({ ...invoice, ...json.invoice });
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-label="Edit invoice"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={() => !saving && onCancel()}
      />
      <div className="relative flex max-h-full w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#0f172a]">
              Edit Invoice {invoice.invoice_number}
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Update any field. Changes apply only while the invoice is still a draft.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            aria-label="Close edit form"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Invoice number */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Invoice Number
            </h4>
            <Input
              label="Invoice Number"
              value={form.invoice_number}
              onChange={(e) => update('invoice_number', e.target.value)}
              hint="Edit to override the auto-generated number."
            />
          </section>

          {/* Payee */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Bill To (Lessor)
            </h4>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Input
                label="Payee Name"
                value={form.payee_name}
                onChange={(e) => update('payee_name', e.target.value)}
              />
              <Input
                label="Payee Address"
                value={form.payee_address}
                onChange={(e) => update('payee_address', e.target.value)}
              />
              <Input
                label="City, State ZIP"
                value={form.payee_city_state_zip}
                onChange={(e) => update('payee_city_state_zip', e.target.value)}
                className="sm:col-span-2"
              />
            </div>
          </section>

          {/* Property + tenant */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Property &amp; Tenant
            </h4>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Input
                label="Property Address"
                value={form.property_address}
                onChange={(e) => update('property_address', e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                label="Suite"
                value={form.suite_number}
                placeholder="e.g. 100"
                onChange={(e) => update('suite_number', e.target.value)}
              />
              <Input
                label="Tenant (Lessee)"
                value={form.lessee_name}
                onChange={(e) => update('lessee_name', e.target.value)}
              />
              <Input
                label="Suite Size (SF)"
                type="number"
                min={0}
                step="1"
                value={form.suite_sf}
                placeholder="e.g. 2500"
                hint="Enables annual / PSF breakdown on the invoice."
                onChange={(e) => update('suite_sf', e.target.value)}
              />
            </div>
          </section>

          {/* Commission math */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Commission
            </h4>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Lease Term (months)"
                type="number"
                min={0}
                value={form.lease_term_months}
                onChange={(e) => update('lease_term_months', e.target.value)}
              />
              <Input
                label="Monthly Rent ($)"
                type="number"
                step="0.01"
                min={0}
                value={form.monthly_rent}
                onChange={(e) => update('monthly_rent', e.target.value)}
              />
              <Input
                label="Total Consideration ($)"
                type="number"
                step="0.01"
                min={0}
                value={form.total_consideration}
                onChange={(e) => update('total_consideration', e.target.value)}
              />
              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.commission_rate_percent}
                onChange={(e) => update('commission_rate_percent', e.target.value)}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => update('due_date', e.target.value)}
              />
              <Input
                label="Commission Amount ($)"
                value={
                  derivedCommission !== null
                    ? `$${derivedCommission.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : '—'
                }
                readOnly
                hint="Auto-calculated from total × rate × split."
                onChange={() => {}}
              />
            </div>
          </section>

          {/* Split */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Commission Split
            </h4>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Split Type"
                value={form.split_type}
                onChange={(e) => update('split_type', e.target.value as SplitType)}
              >
                <option value="full">Full (representing both sides)</option>
                <option value="split">Split with other agent</option>
              </Select>
              {form.split_type === 'split' && (
                <>
                  <Input
                    label="Our Share (%)"
                    type="number"
                    min={1}
                    max={99}
                    step="1"
                    value={form.split_percent}
                    onChange={(e) => update('split_percent', e.target.value)}
                  />
                  <Input
                    label="Cooperating Agent / Brokerage"
                    value={form.split_with_agent}
                    onChange={(e) => update('split_with_agent', e.target.value)}
                  />
                </>
              )}
            </div>
          </section>

          {/* Notes */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Notes
            </h4>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
            />
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#e2e8f0] px-6 py-4">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Save}
            className="flex-1"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
