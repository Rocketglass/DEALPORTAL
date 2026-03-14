'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

const propertyTypes = [
  { value: '', label: 'Select type...' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'mixed', label: 'Mixed Use' },
];

interface FormState {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  property_type: string;
  total_sf: string;
  land_area_sf: string;
  year_built: string;
  zoning: string;
  parcel_number: string;
  parking_spaces: string;
  parking_ratio: string;
  power: string;
  clear_height_ft: string;
  dock_high_doors: string;
  grade_level_doors: string;
  levelers: string;
  crane_capacity_tons: string;
  description: string;
}

const initialState: FormState = {
  name: '',
  address: '',
  city: '',
  state: 'CA',
  zip: '',
  county: '',
  property_type: '',
  total_sf: '',
  land_area_sf: '',
  year_built: '',
  zoning: '',
  parcel_number: '',
  parking_spaces: '',
  parking_ratio: '',
  power: '',
  clear_height_ft: '',
  dock_high_doors: '',
  grade_level_doors: '',
  levelers: '',
  crane_capacity_tons: '',
  description: '',
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Property name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.zip.trim()) newErrors.zip = 'ZIP code is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    // In production this would POST to an API
    setTimeout(() => {
      router.push('/properties');
    }, 500);
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add New Property</h1>
        <p className="mt-0.5 text-muted-foreground">
          Enter the property details below. You can add units after creating the property.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Property Name"
              required
              value={form.name}
              error={errors.name}
              onChange={(v) => handleChange('name', v)}
            />
            <FormField
              label="Address"
              required
              value={form.address}
              error={errors.address}
              onChange={(v) => handleChange('address', v)}
              className="sm:col-span-2"
            />
            <FormField
              label="City"
              required
              value={form.city}
              error={errors.city}
              onChange={(v) => handleChange('city', v)}
            />
            <FormField
              label="State"
              value={form.state}
              onChange={(v) => handleChange('state', v)}
            />
            <FormField
              label="ZIP"
              required
              value={form.zip}
              error={errors.zip}
              onChange={(v) => handleChange('zip', v)}
            />
            <FormField
              label="County"
              value={form.county}
              onChange={(v) => handleChange('county', v)}
            />
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Property Type
              </label>
              <select
                value={form.property_type}
                onChange={(e) => handleChange('property_type', e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {propertyTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Building Details */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Building Details</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Total SF"
              type="number"
              value={form.total_sf}
              onChange={(v) => handleChange('total_sf', v)}
            />
            <FormField
              label="Land Area SF"
              type="number"
              value={form.land_area_sf}
              onChange={(v) => handleChange('land_area_sf', v)}
            />
            <FormField
              label="Year Built"
              type="number"
              value={form.year_built}
              onChange={(v) => handleChange('year_built', v)}
            />
            <FormField
              label="Zoning"
              value={form.zoning}
              onChange={(v) => handleChange('zoning', v)}
            />
            <FormField
              label="Parcel Number"
              value={form.parcel_number}
              onChange={(v) => handleChange('parcel_number', v)}
            />
          </div>
        </div>

        {/* Parking & Infrastructure */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Parking & Infrastructure</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Parking Spaces"
              type="number"
              value={form.parking_spaces}
              onChange={(v) => handleChange('parking_spaces', v)}
            />
            <FormField
              label="Parking Ratio"
              type="number"
              value={form.parking_ratio}
              onChange={(v) => handleChange('parking_ratio', v)}
              step="0.01"
            />
            <FormField
              label="Power"
              value={form.power}
              onChange={(v) => handleChange('power', v)}
              placeholder="e.g. 400A 3-Phase"
            />
            <FormField
              label="Clear Height (ft)"
              type="number"
              value={form.clear_height_ft}
              onChange={(v) => handleChange('clear_height_ft', v)}
            />
            <FormField
              label="Dock High Doors"
              type="number"
              value={form.dock_high_doors}
              onChange={(v) => handleChange('dock_high_doors', v)}
            />
            <FormField
              label="Grade Level Doors"
              type="number"
              value={form.grade_level_doors}
              onChange={(v) => handleChange('grade_level_doors', v)}
            />
            <FormField
              label="Levelers"
              type="number"
              value={form.levelers}
              onChange={(v) => handleChange('levelers', v)}
            />
            <FormField
              label="Crane Capacity (tons)"
              type="number"
              value={form.crane_capacity_tons}
              onChange={(v) => handleChange('crane_capacity_tons', v)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Description</h2>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Property description, notable features, location highlights..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/properties"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Property'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable form field
// ---------------------------------------------------------------------------

function FormField({
  label,
  value,
  onChange,
  error,
  required,
  type = 'text',
  placeholder,
  className,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
  step?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive'
            : 'border-border focus:border-primary focus:ring-primary'
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
