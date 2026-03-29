'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SECTION_OPTIONS = [
  { key: 'base_rent', label: 'Base Rent' },
  { key: 'term', label: 'Lease Term' },
  { key: 'tenant_improvements', label: 'Tenant Improvements' },
  { key: 'cam', label: 'CAM / Operating Expenses' },
  { key: 'security_deposit', label: 'Security Deposit' },
  { key: 'agreed_use', label: 'Agreed Use' },
  { key: 'parking', label: 'Parking' },
  { key: 'options', label: 'Renewal / Expansion Options' },
  { key: 'escalations', label: 'Rent Escalations' },
  { key: 'free_rent', label: 'Free Rent / Abatement' },
  { key: 'other', label: 'Other' },
] as const;

interface Props {
  loiId: string;
}

export function AddSectionButton({ loiId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sectionKey, setSectionKey] = useState('base_rent');
  const [label, setLabel] = useState('Base Rent');
  const [proposedValue, setProposedValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleKeyChange(key: string) {
    setSectionKey(key);
    const match = SECTION_OPTIONS.find((o) => o.key === key);
    if (match) setLabel(match.label);
  }

  async function handleSave() {
    if (!proposedValue.trim()) {
      setError('Proposed value is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/lois/${loiId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_key: sectionKey,
          section_label: label,
          proposed_value: proposedValue.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to add section');
        setSaving(false);
        return;
      }

      // Reset form and refresh page data
      setOpen(false);
      setProposedValue('');
      setSectionKey('base_rent');
      setLabel('Base Rent');
      router.refresh();
    } catch {
      setError('Failed to add section. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" icon={Plus} onClick={() => setOpen(true)}>
        Add Section
      </Button>
    );
  }

  const inputClasses =
    'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-150';
  const labelClasses = 'mb-1.5 block text-[12px] font-medium text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Add Section</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(''); }}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="section-type" className={labelClasses}>
            Section Type
          </label>
          <select
            id="section-type"
            value={sectionKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            className={inputClasses}
          >
            {SECTION_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="section-label" className={labelClasses}>
            Label
          </label>
          <input
            id="section-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputClasses}
            placeholder="Section label"
          />
        </div>

        <div>
          <label htmlFor="proposed-value" className={labelClasses}>
            Proposed Value
          </label>
          <textarea
            id="proposed-value"
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            className={`${inputClasses} min-h-[80px] resize-y`}
            placeholder="Enter the proposed value for this section..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => { setOpen(false); setError(''); }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={saving ? Loader2 : Plus}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Add Section'}
          </Button>
        </div>
      </div>
    </div>
  );
}
