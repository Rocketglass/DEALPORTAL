'use client';

import { useState } from 'react';
import {
  Save,
  Plus,
  QrCode,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Check,
} from 'lucide-react';
import type { Property, Unit, QrCode as QrCodeType } from '@/types/database';
import { formatCurrency, formatSqft, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockProperty: Property = {
  id: 'prop-1',
  name: 'RSD Commercentre',
  address: '1245 Pioneer Way',
  city: 'El Cajon',
  state: 'CA',
  zip: '92020',
  county: 'San Diego',
  property_type: 'industrial',
  total_sf: 48000,
  land_area_sf: 96000,
  year_built: 1988,
  zoning: 'IL',
  parcel_number: '483-120-07',
  parking_spaces: 40,
  parking_ratio: 0.83,
  power: '400A 3-Phase',
  clear_height_ft: 24,
  dock_high_doors: 6,
  grade_level_doors: 4,
  levelers: 2,
  crane_capacity_tons: null,
  building_far: null,
  primary_leasing_company: 'Rocket Glass CCIM',
  description:
    'Multi-tenant industrial park in El Cajon with excellent freeway access. Located minutes from I-8 with good visibility and truck access.',
  features: [],
  photos: [],
  floorplan_url: null,
  is_active: true,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
};

const mockUnits: (Unit & { tenantName?: string })[] = [
  {
    id: 'unit-1',
    property_id: 'prop-1',
    suite_number: '101',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 5400,
    rent_per_sqft: 0.9,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2023,
    current_lease_id: 'lease-1',
    marketing_rate: 1.05,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'Pacific Coast Welding',
  },
  {
    id: 'unit-2',
    property_id: 'prop-1',
    suite_number: '102',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 5400,
    rent_per_sqft: 0.9,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2023,
    current_lease_id: 'lease-2',
    marketing_rate: 1.05,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'Summit Auto Parts',
  },
  {
    id: 'unit-3',
    property_id: 'prop-1',
    suite_number: '103',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 5700,
    rent_per_sqft: 0.95,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2024,
    current_lease_id: 'lease-3',
    marketing_rate: 1.05,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'West Coast Packaging',
  },
  {
    id: 'unit-4',
    property_id: 'prop-1',
    suite_number: '104',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'pending',
    monthly_rent: null,
    rent_per_sqft: null,
    cam_percent: null,
    cam_monthly: 360,
    base_year: null,
    current_lease_id: null,
    marketing_rate: 1.1,
    marketing_notes: 'Application under review',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: undefined,
  },
  {
    id: 'unit-5',
    property_id: 'prop-1',
    suite_number: '201',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 6000,
    rent_per_sqft: 1.0,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2024,
    current_lease_id: 'lease-5',
    marketing_rate: 1.1,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'Inland Fabrication',
  },
  {
    id: 'unit-6',
    property_id: 'prop-1',
    suite_number: '202',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 6000,
    rent_per_sqft: 1.0,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2024,
    current_lease_id: 'lease-6',
    marketing_rate: 1.1,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'East County Electrical',
  },
  {
    id: 'unit-7',
    property_id: 'prop-1',
    suite_number: '203',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'occupied',
    monthly_rent: 5700,
    rent_per_sqft: 0.95,
    cam_percent: null,
    cam_monthly: 360,
    base_year: 2023,
    current_lease_id: 'lease-7',
    marketing_rate: 1.1,
    marketing_notes: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: 'SD Precision Machine',
  },
  {
    id: 'unit-8',
    property_id: 'prop-1',
    suite_number: '204',
    sf: 6000,
    unit_type: 'warehouse',
    status: 'vacant',
    monthly_rent: null,
    rent_per_sqft: null,
    cam_percent: null,
    cam_monthly: 360,
    base_year: null,
    current_lease_id: null,
    marketing_rate: 1.1,
    marketing_notes: 'Recently renovated, new LED lighting',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    tenantName: undefined,
  },
];

const mockQrCodes: QrCodeType[] = [
  {
    id: 'qr-1',
    property_id: 'prop-1',
    unit_id: null,
    short_code: 'rsd-main',
    portal_url: 'https://portal.rocketrealty.com/p/rsd-main',
    qr_image_url: null,
    is_active: true,
    scan_count: 47,
    last_scanned_at: '2024-11-28T14:30:00Z',
    created_at: '2024-06-15T00:00:00Z',
  },
  {
    id: 'qr-2',
    property_id: 'prop-1',
    unit_id: 'unit-8',
    short_code: 'rsd-204',
    portal_url: 'https://portal.rocketrealty.com/p/rsd-204',
    qr_image_url: null,
    is_active: true,
    scan_count: 12,
    last_scanned_at: '2024-11-25T09:15:00Z',
    created_at: '2024-09-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const _unitStatusStyles: Record<string, string> = {
  vacant: 'border border-green-300 text-green-700 bg-green-50',
  occupied: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-gray-100 text-gray-700',
};

const propertyTypes = ['industrial', 'commercial', 'retail', 'office', 'mixed'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PropertyDetailPage() {
  const [property, setProperty] = useState(mockProperty);
  const [units] = useState(mockUnits);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<Record<string, Partial<Unit>>>({});
  const [qrCodes] = useState(mockQrCodes);
  const [qrUnitDropdown, setQrUnitDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [shakeKey, setShakeKey] = useState(0);

  function handlePropertyChange(field: string, value: string | number | null) {
    setProperty((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    // Clear error for this field
    setPropertyErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateProperty(): boolean {
    const errors: Record<string, string> = {};
    if (!property.name.trim()) errors.name = 'Property name is required';
    if (!property.address.trim()) errors.address = 'Street address is required';
    if (!property.city.trim()) errors.city = 'City is required';
    if (property.state.trim() && property.state.trim().length !== 2) errors.state = 'State must be a 2-character abbreviation';
    if (!property.zip.trim()) {
      errors.zip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(property.zip.trim())) {
      errors.zip = 'Enter a valid ZIP code (e.g. 92020)';
    }
    setPropertyErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShakeKey((k) => k + 1);
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!validateProperty()) return;
    // In production this would POST to an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleUnitExpand(unitId: string) {
    if (expandedUnit === unitId) {
      setExpandedUnit(null);
    } else {
      setExpandedUnit(unitId);
      if (!editingUnit[unitId]) {
        const unit = units.find((u) => u.id === unitId);
        if (unit) {
          setEditingUnit((prev) => ({
            ...prev,
            [unitId]: {
              suite_number: unit.suite_number,
              sf: unit.sf,
              unit_type: unit.unit_type,
              status: unit.status,
              monthly_rent: unit.monthly_rent,
              marketing_rate: unit.marketing_rate,
            },
          }));
        }
      }
    }
  }

  function handleCopyLink(url: string, qrId: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(qrId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const vacantUnits = units.filter((u) => u.status === 'vacant');

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <BackButton href="/properties" label="Back to Properties" />
        <h1 className="mt-2 text-2xl font-bold">{property.name}</h1>
        <p className="mt-0.5 text-muted-foreground">
          {property.address}, {property.city}, {property.state} {property.zip}
        </p>
      </div>

      {/* ================================================================= */}
      {/* Property Info Section                                              */}
      {/* ================================================================= */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Property Information</h2>
            <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
              {saved ? 'Saved' : 'Save Changes'}
            </Button>
          </div>

        <div key={shakeKey} className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3', shakeKey > 0 && 'animate-shake')}>
          <InputField label="Property Name" required value={property.name} onChange={(v) => handlePropertyChange('name', v)} error={propertyErrors.name} />
          <InputField label="Address" required value={property.address} onChange={(v) => handlePropertyChange('address', v)} error={propertyErrors.address} />
          <InputField label="City" required value={property.city} onChange={(v) => handlePropertyChange('city', v)} error={propertyErrors.city} />
          <InputField label="State" value={property.state} onChange={(v) => handlePropertyChange('state', v)} error={propertyErrors.state} />
          <InputField label="ZIP" required value={property.zip} onChange={(v) => handlePropertyChange('zip', v)} error={propertyErrors.zip} />
          <Select
            label="Property Type"
            value={property.property_type}
            onChange={(e) => handlePropertyChange('property_type', e.target.value)}
          >
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
          <InputField
            label="Total SF"
            type="number"
            value={property.total_sf?.toString() ?? ''}
            onChange={(v) => handlePropertyChange('total_sf', v ? Number(v) : null)}
          />
          <InputField
            label="Year Built"
            type="number"
            value={property.year_built?.toString() ?? ''}
            onChange={(v) => handlePropertyChange('year_built', v ? Number(v) : null)}
          />
          <InputField
            label="Zoning"
            value={property.zoning ?? ''}
            onChange={(v) => handlePropertyChange('zoning', v || null)}
          />
          <InputField
            label="Parking Spaces"
            type="number"
            value={property.parking_spaces?.toString() ?? ''}
            onChange={(v) => handlePropertyChange('parking_spaces', v ? Number(v) : null)}
          />
          <InputField
            label="Power"
            value={property.power ?? ''}
            onChange={(v) => handlePropertyChange('power', v || null)}
          />
          <InputField
            label="Clear Height (ft)"
            type="number"
            value={property.clear_height_ft?.toString() ?? ''}
            onChange={(v) => handlePropertyChange('clear_height_ft', v ? Number(v) : null)}
          />
          <InputField
            label="Dock High Doors"
            type="number"
            value={property.dock_high_doors.toString()}
            onChange={(v) => handlePropertyChange('dock_high_doors', Number(v) || 0)}
          />
          <InputField
            label="Grade Level Doors"
            type="number"
            value={property.grade_level_doors.toString()}
            onChange={(v) => handlePropertyChange('grade_level_doors', Number(v) || 0)}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          className="mt-4"
          value={property.description ?? ''}
          onChange={(e) => handlePropertyChange('description', e.target.value || null)}
          rows={3}
        />

        {/* Photo upload placeholder */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Photos</label>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border py-10">
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop photos here, or{' '}
                <button className="text-primary hover:underline font-medium">browse</button>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* Units Table                                                        */}
      {/* ================================================================= */}
      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Units</h2>
          <Button variant="secondary" icon={Plus}>
            Add Unit
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">Suite #</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">SF</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Monthly Rent</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">$/SF</th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Current Tenant</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <>
                <tr
                  key={unit.id}
                  onClick={() => toggleUnitExpand(unit.id)}
                  className={cn(
                    'border-b border-border cursor-pointer transition-colors hover:bg-muted/50',
                    expandedUnit === unit.id && 'bg-muted/30'
                  )}
                >
                  <td className="px-6 py-3 font-medium">{unit.suite_number}</td>
                  <td className="px-4 py-3">{formatSqft(unit.sf)}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{unit.unit_type ?? '--'}</td>
                  <td className="px-4 py-3">
                    <Badge status={unit.status} />
                  </td>
                  <td className="px-4 py-3">
                    {unit.monthly_rent != null ? formatCurrency(unit.monthly_rent) : '--'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {unit.rent_per_sqft != null ? `$${unit.rent_per_sqft.toFixed(2)}` : '--'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.tenantName ?? '--'}</td>
                  <td className="px-4 py-3">
                    {expandedUnit === unit.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                </tr>

                {/* Expanded inline edit */}
                {expandedUnit === unit.id && (
                  <tr key={`${unit.id}-edit`} className="border-b border-border bg-muted/20">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                        <div>
                          <label htmlFor={`unit-${unit.id}-suite`} className="block text-xs font-medium text-muted-foreground mb-1">Suite Number</label>
                          <input
                            id={`unit-${unit.id}-suite`}
                            type="text"
                            value={editingUnit[unit.id]?.suite_number ?? ''}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: { ...prev[unit.id], suite_number: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unit-${unit.id}-sf`} className="block text-xs font-medium text-muted-foreground mb-1">SF</label>
                          <input
                            id={`unit-${unit.id}-sf`}
                            type="number"
                            value={editingUnit[unit.id]?.sf ?? ''}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: { ...prev[unit.id], sf: Number(e.target.value) },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unit-${unit.id}-type`} className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                          <input
                            id={`unit-${unit.id}-type`}
                            type="text"
                            value={editingUnit[unit.id]?.unit_type ?? ''}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: { ...prev[unit.id], unit_type: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unit-${unit.id}-status`} className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                          <select
                            id={`unit-${unit.id}-status`}
                            value={editingUnit[unit.id]?.status ?? 'vacant'}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: { ...prev[unit.id], status: e.target.value as Unit['status'] },
                              }))
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="vacant">Vacant</option>
                            <option value="occupied">Occupied</option>
                            <option value="pending">Pending</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`unit-${unit.id}-rent`} className="block text-xs font-medium text-muted-foreground mb-1">Monthly Rent</label>
                          <input
                            id={`unit-${unit.id}-rent`}
                            type="number"
                            value={editingUnit[unit.id]?.monthly_rent ?? ''}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: {
                                  ...prev[unit.id],
                                  monthly_rent: e.target.value ? Number(e.target.value) : null,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unit-${unit.id}-marketing`} className="block text-xs font-medium text-muted-foreground mb-1">
                            Marketing Rate ($/SF)
                          </label>
                          <input
                            id={`unit-${unit.id}-marketing`}
                            type="number"
                            step="0.01"
                            value={editingUnit[unit.id]?.marketing_rate ?? ''}
                            onChange={(e) =>
                              setEditingUnit((prev) => ({
                                ...prev,
                                [unit.id]: {
                                  ...prev[unit.id],
                                  marketing_rate: e.target.value ? Number(e.target.value) : null,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setExpandedUnit(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => setExpandedUnit(null)}>
                          Save Unit
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ================================================================= */}
      {/* QR Codes Section                                                   */}
      {/* ================================================================= */}
      <Card className="mt-8">
        <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">QR Codes</h2>
          <div className="flex items-center gap-2">
            {/* Generate for unit dropdown */}
            <div className="relative">
              <button
                onClick={() => setQrUnitDropdown(!qrUnitDropdown)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <QrCode className="h-4 w-4" />
                Generate for Unit
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {qrUnitDropdown && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                  {vacantUnits.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No vacant units</p>
                  ) : (
                    vacantUnits.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => setQrUnitDropdown(false)}
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        Suite {unit.suite_number} — {formatSqft(unit.sf)}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button variant="primary" icon={QrCode}>
              Generate QR Code
            </Button>
          </div>
        </div>

        {qrCodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="mx-auto h-10 w-10 opacity-30" />
            <p className="mt-3 text-sm">No QR codes generated yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {qrCodes.map((qr) => {
              const linkedUnit = units.find((u) => u.id === qr.unit_id);
              return (
                <div
                  key={qr.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-4"
                >
                  {/* QR placeholder */}
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <svg
                      viewBox="0 0 100 100"
                      className="h-12 w-12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Simplified QR-like pattern */}
                      <rect x="5" y="5" width="30" height="30" rx="2" fill="#0f172a" />
                      <rect x="10" y="10" width="20" height="20" rx="1" fill="white" />
                      <rect x="14" y="14" width="12" height="12" rx="1" fill="#0f172a" />
                      <rect x="65" y="5" width="30" height="30" rx="2" fill="#0f172a" />
                      <rect x="70" y="10" width="20" height="20" rx="1" fill="white" />
                      <rect x="74" y="14" width="12" height="12" rx="1" fill="#0f172a" />
                      <rect x="5" y="65" width="30" height="30" rx="2" fill="#0f172a" />
                      <rect x="10" y="70" width="20" height="20" rx="1" fill="white" />
                      <rect x="14" y="74" width="12" height="12" rx="1" fill="#0f172a" />
                      <rect x="40" y="5" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="5" width="8" height="8" fill="#0f172a" />
                      <rect x="40" y="17" width="8" height="8" fill="#0f172a" />
                      <rect x="40" y="40" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="40" width="8" height="8" fill="#0f172a" />
                      <rect x="65" y="40" width="8" height="8" fill="#0f172a" />
                      <rect x="40" y="52" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="52" width="8" height="8" fill="#0f172a" />
                      <rect x="65" y="52" width="8" height="8" fill="#0f172a" />
                      <rect x="78" y="52" width="8" height="8" fill="#0f172a" />
                      <rect x="65" y="65" width="8" height="8" fill="#0f172a" />
                      <rect x="78" y="65" width="8" height="8" fill="#0f172a" />
                      <rect x="65" y="78" width="8" height="8" fill="#0f172a" />
                      <rect x="78" y="78" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="78" width="8" height="8" fill="#0f172a" />
                      <rect x="40" y="65" width="8" height="8" fill="#0f172a" />
                    </svg>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {linkedUnit ? `Suite ${linkedUnit.suite_number}` : 'Entire Property'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{qr.portal_url}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{qr.scan_count} scans</span>
                      <span>
                        Created{' '}
                        {new Date(qr.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(qr.portal_url, qr.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {copiedId === qr.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Download className="h-3.5 w-3.5" />
                      PNG
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable input field (wraps Input component for value/onChange compat)
// ---------------------------------------------------------------------------

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <Input
      label={label}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      required={required}
    />
  );
}
