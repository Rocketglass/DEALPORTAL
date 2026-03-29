'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

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
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
