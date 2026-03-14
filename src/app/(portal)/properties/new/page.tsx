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
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Property name is required';
    if (!form.address.trim()) newErrors.address = 'Street address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (form.state.trim() && form.state.trim().length !== 2) newErrors.state = 'State must be a 2-character abbreviation';
    if (!form.zip.trim()) {
      newErrors.zip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) {
      newErrors.zip = 'Enter a valid ZIP code (e.g. 92020)';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setShakeKey((k) => k + 1);
    }
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
        <BackButton href="/properties" label="Back to Properties" />
        <h1 className="mt-2 text-2xl font-bold">Add New Property</h1>
        <p className="mt-0.5 text-muted-foreground">
          Enter the property details below. You can add units after creating the property.
        </p>
      </div>

      <form key={shakeKey} onSubmit={handleSubmit} className={shakeKey > 0 ? 'animate-shake' : ''}>
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Property Name"
                required
                value={form.name}
                error={errors.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              <Input
                label="Address"
                required
                value={form.address}
                error={errors.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="sm:col-span-2"
              />
              <Input
                label="City"
                required
                value={form.city}
                error={errors.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
              <Input
                label="State"
                value={form.state}
                error={errors.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
              <Input
                label="ZIP"
                required
                value={form.zip}
                error={errors.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
              />
              <Input
                label="County"
                value={form.county}
                onChange={(e) => handleChange('county', e.target.value)}
              />
              <Select
                label="Property Type"
                value={form.property_type}
                onChange={(e) => handleChange('property_type', e.target.value)}
              >
                {propertyTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Building Details */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Building Details</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Total SF"
                type="number"
                value={form.total_sf}
                onChange={(e) => handleChange('total_sf', e.target.value)}
              />
              <Input
                label="Land Area SF"
                type="number"
                value={form.land_area_sf}
                onChange={(e) => handleChange('land_area_sf', e.target.value)}
              />
              <Input
                label="Year Built"
                type="number"
                value={form.year_built}
                onChange={(e) => handleChange('year_built', e.target.value)}
              />
              <Input
                label="Zoning"
                value={form.zoning}
                onChange={(e) => handleChange('zoning', e.target.value)}
              />
              <Input
                label="Parcel Number"
                value={form.parcel_number}
                onChange={(e) => handleChange('parcel_number', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Parking & Infrastructure */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Parking & Infrastructure</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Parking Spaces"
                type="number"
                value={form.parking_spaces}
                onChange={(e) => handleChange('parking_spaces', e.target.value)}
              />
              <Input
                label="Parking Ratio"
                type="number"
                step={0.01}
                value={form.parking_ratio}
                onChange={(e) => handleChange('parking_ratio', e.target.value)}
              />
              <Input
                label="Power"
                value={form.power}
                placeholder="e.g. 400A 3-Phase"
                onChange={(e) => handleChange('power', e.target.value)}
              />
              <Input
                label="Clear Height (ft)"
                type="number"
                value={form.clear_height_ft}
                onChange={(e) => handleChange('clear_height_ft', e.target.value)}
              />
              <Input
                label="Dock High Doors"
                type="number"
                value={form.dock_high_doors}
                onChange={(e) => handleChange('dock_high_doors', e.target.value)}
              />
              <Input
                label="Grade Level Doors"
                type="number"
                value={form.grade_level_doors}
                onChange={(e) => handleChange('grade_level_doors', e.target.value)}
              />
              <Input
                label="Levelers"
                type="number"
                value={form.levelers}
                onChange={(e) => handleChange('levelers', e.target.value)}
              />
              <Input
                label="Crane Capacity (tons)"
                type="number"
                value={form.crane_capacity_tons}
                onChange={(e) => handleChange('crane_capacity_tons', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Property description, notable features, location highlights..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link href="/properties">
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
            {saving ? 'Saving...' : 'Save Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}
