'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

type SplitType = 'full' | 'split';

interface FormState {
  payee_name: string;
  payee_email: string;
  payee_address: string;
  property_address: string;
  suite_number: string;
  description: string;
  commission_amount: string;
  commission_rate_percent: string;
  total_consideration: string;
  due_date: string;
  notes: string;
  split_type: SplitType;
  split_percent: string;
  split_with_agent: string;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const initialState: FormState = {
  payee_name: '',
  payee_email: '',
  payee_address: '',
  property_address: '',
  suite_number: '',
  description: '',
  commission_amount: '',
  commission_rate_percent: '',
  total_consideration: '',
  due_date: getDefaultDueDate(),
  notes: '',
  split_type: 'full',
  split_percent: '50',
  split_with_agent: '',
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-calculate commission amount when rate, total consideration, or split change
      const rate = parseFloat(field === 'commission_rate_percent' ? value : next.commission_rate_percent);
      const consideration = parseFloat(field === 'total_consideration' ? value : next.total_consideration);
      const splitType = field === 'split_type' ? (value as SplitType) : next.split_type;
      const splitPct = parseFloat(field === 'split_percent' ? value : next.split_percent);

      if (!isNaN(rate) && rate > 0 && !isNaN(consideration) && consideration > 0) {
        const share = splitType === 'split' && !isNaN(splitPct) && splitPct > 0
          ? splitPct / 100
          : 1;
        const amount = Math.round(consideration * (rate / 100) * share * 100) / 100;
        next.commission_amount = amount.toFixed(2);
      }

      // Reset split_with_agent when switching to full
      if (field === 'split_type' && value === 'full') {
        next.split_with_agent = '';
      }

      return next;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.payee_name.trim()) newErrors.payee_name = 'Payee name is required';
    if (!form.payee_email.trim()) {
      newErrors.payee_email = 'Payee email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.payee_email.trim())) {
      newErrors.payee_email = 'Enter a valid email address';
    }
    if (!form.property_address.trim()) newErrors.property_address = 'Property address is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.commission_amount.trim()) {
      newErrors.commission_amount = 'Commission amount is required';
    } else if (isNaN(Number(form.commission_amount)) || Number(form.commission_amount) <= 0) {
      newErrors.commission_amount = 'Must be a positive number';
    }
    if (form.commission_rate_percent.trim() && (isNaN(Number(form.commission_rate_percent)) || Number(form.commission_rate_percent) < 0 || Number(form.commission_rate_percent) > 100)) {
      newErrors.commission_rate_percent = 'Must be between 0 and 100';
    }
    if (form.total_consideration.trim() && (isNaN(Number(form.total_consideration)) || Number(form.total_consideration) < 0)) {
      newErrors.total_consideration = 'Must be a non-negative number';
    }
    if (form.split_type === 'split') {
      const pct = Number(form.split_percent);
      if (isNaN(pct) || pct < 1 || pct > 99) {
        newErrors.split_percent = 'Split percentage must be between 1 and 99';
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setShakeKey((k) => k + 1);
    }
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError(null);

    try {
      const payload: Record<string, unknown> = {
        payee_name: form.payee_name.trim(),
        payee_email: form.payee_email.trim(),
        property_address: form.property_address.trim(),
        description: form.description.trim(),
        commission_amount: Number(form.commission_amount),
      };
      if (form.payee_address.trim()) payload.payee_address = form.payee_address.trim();
      if (form.suite_number.trim()) payload.suite_number = form.suite_number.trim();
      if (form.commission_rate_percent.trim()) payload.commission_rate_percent = Number(form.commission_rate_percent);
      if (form.total_consideration.trim()) payload.total_consideration = Number(form.total_consideration);
      if (form.due_date) payload.due_date = form.due_date;
      if (form.notes.trim()) payload.notes = form.notes.trim();

      // Commission split
      if (form.split_type === 'split') {
        const pct = Number(form.split_percent);
        if (!isNaN(pct) && pct > 0 && pct < 100) {
          payload.commission_split_percent = pct;
        }
        if (form.split_with_agent.trim()) {
          payload.split_with_agent = form.split_with_agent.trim();
        }
      } else {
        payload.commission_split_percent = 100;
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body.error || 'Failed to create invoice');
        setSaving(false);
        return;
      }

      const { invoice } = await res.json();
      router.push(`/invoices/${invoice.id}`);
    } catch {
      setServerError('An unexpected error occurred');
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <BackButton href="/invoices" label="Back to Invoices" />
        <h1 className="mt-2 text-2xl font-bold">Create Invoice</h1>
        <p className="mt-0.5 text-muted-foreground">
          Create a manual commission invoice. Fill in the details below.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form key={shakeKey} onSubmit={handleSubmit} className={shakeKey > 0 ? 'animate-shake' : ''}>
        {/* Payee Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payee Information</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Payee Name"
                required
                value={form.payee_name}
                error={errors.payee_name}
                placeholder="Company or individual name"
                onChange={(e) => handleChange('payee_name', e.target.value)}
              />
              <Input
                label="Payee Email"
                required
                type="email"
                value={form.payee_email}
                error={errors.payee_email}
                placeholder="payee@example.com"
                onChange={(e) => handleChange('payee_email', e.target.value)}
              />
              <Input
                label="Payee Address"
                value={form.payee_address}
                error={errors.payee_address}
                placeholder="Mailing address"
                onChange={(e) => handleChange('payee_address', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Property Reference */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Property Reference</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Property / Address"
                required
                value={form.property_address}
                error={errors.property_address}
                placeholder="123 Main St, San Diego, CA"
                onChange={(e) => handleChange('property_address', e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                label="Suite Number"
                value={form.suite_number}
                placeholder="e.g. Suite 100"
                onChange={(e) => handleChange('suite_number', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Description"
                required
                value={form.description}
                error={errors.description}
                placeholder="e.g. Lease renewal commission"
                onChange={(e) => handleChange('description', e.target.value)}
                className="sm:col-span-2 lg:col-span-3"
              />
              <Input
                label="Commission Amount ($)"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.commission_amount}
                error={errors.commission_amount}
                placeholder="0.00"
                onChange={(e) => handleChange('commission_amount', e.target.value)}
              />
              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.commission_rate_percent}
                error={errors.commission_rate_percent}
                placeholder="e.g. 5.0"
                onChange={(e) => handleChange('commission_rate_percent', e.target.value)}
              />
              <Input
                label="Total Consideration ($)"
                type="number"
                step="0.01"
                min="0"
                value={form.total_consideration}
                error={errors.total_consideration}
                placeholder="0.00"
                onChange={(e) => handleChange('total_consideration', e.target.value)}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Commission Split */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Commission Split</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Split Type"
                value={form.split_type}
                onChange={(e) => handleChange('split_type', e.target.value)}
              >
                <option value="full">Full (representing both sides)</option>
                <option value="split">Split with other agent</option>
              </Select>
              {form.split_type === 'split' && (
                <>
                  <Input
                    label="Our Share (%)"
                    type="number"
                    step="1"
                    min="1"
                    max="99"
                    value={form.split_percent}
                    error={errors.split_percent}
                    placeholder="e.g. 50"
                    onChange={(e) => handleChange('split_percent', e.target.value)}
                  />
                  <Input
                    label="Cooperating Agent / Brokerage"
                    value={form.split_with_agent}
                    placeholder="e.g. CBRE, Marcus & Millichap"
                    onChange={(e) => handleChange('split_with_agent', e.target.value)}
                  />
                </>
              )}
            </div>
            {form.split_type === 'split' && form.commission_rate_percent && form.total_consideration && (
              <p className="mt-3 text-sm text-[#64748b]">
                Total commission: {Number(form.commission_rate_percent)}% of{' '}
                ${Number(form.total_consideration).toLocaleString()} ={' '}
                ${(Number(form.total_consideration) * Number(form.commission_rate_percent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.{' '}
                Our {form.split_percent}% share ={' '}
                ${Number(form.commission_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="Additional notes or payment instructions..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link href="/invoices">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={saving}
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
