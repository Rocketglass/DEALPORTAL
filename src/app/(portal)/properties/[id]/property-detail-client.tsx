'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Printer,
  CalendarDays,
  Clock,
  X,
  User,
  Mail,
  Eye,
  BarChart3,
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
// Status badge styles
// ---------------------------------------------------------------------------

const propertyTypes = ['industrial', 'commercial', 'retail', 'office', 'mixed'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PropertyDetailClientProps {
  initialProperty: Property;
  initialUnits: (Unit & { tenantName?: string })[];
  initialQrCodes: QrCodeType[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PropertyDetailClient({
  initialProperty,
  initialUnits,
  initialQrCodes,
}: PropertyDetailClientProps) {
  const router = useRouter();
  // Track recently viewed in localStorage
  React.useEffect(() => {
    try {
      const key = 'rr_recently_viewed';
      const stored = localStorage.getItem(key);
      const list: { id: string; name: string; address: string }[] = stored
        ? JSON.parse(stored)
        : [];
      const filtered = list.filter((item) => item.id !== initialProperty.id);
      filtered.unshift({
        id: initialProperty.id,
        name: initialProperty.name,
        address: `${initialProperty.address}, ${initialProperty.city}, ${initialProperty.state}`,
      });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, [initialProperty.id, initialProperty.name, initialProperty.address, initialProperty.city, initialProperty.state]);

  const [property, setProperty] = useState(initialProperty);
  const [units, setUnits] = useState(initialUnits);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<Record<string, Partial<Unit>>>({});
  const [savingUnit, setSavingUnit] = useState<string | null>(null);
  const [qrCodes] = useState(initialQrCodes);
  const [qrUnitDropdown, setQrUnitDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [shakeKey, setShakeKey] = useState(0);

  // Inspection scheduling state
  interface InspectionBooking {
    id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
    company_name: string | null;
    message: string | null;
    status: string;
    created_at: string;
    inspection_slots: { id: string; start_time: string; end_time: string } | null;
  }
  const [inspectionBookings, setInspectionBookings] = useState<InspectionBooking[]>([]);
  const [inspectionLoading, setInspectionLoading] = useState(true);
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [addingSlots, setAddingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSuccess, setSlotSuccess] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    try {
      const res = await fetch('/api/inspections');
      if (res.ok) {
        const data = await res.json();
        // Filter to this property's bookings only
        const propertyBookings = (data.bookings ?? []).filter(
          (b: { property_id: string }) => b.property_id === property.id
        );
        setInspectionBookings(propertyBookings);
      }
    } catch {
      // Non-fatal
    } finally {
      setInspectionLoading(false);
    }
  }, [property.id]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  async function handleAddSlot() {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      setSlotError('Please fill in date, start time, and end time');
      return;
    }

    const startIso = new Date(`${slotDate}T${slotStartTime}`).toISOString();
    const endIso = new Date(`${slotDate}T${slotEndTime}`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setSlotError('End time must be after start time');
      return;
    }

    setAddingSlots(true);
    setSlotError(null);

    try {
      const res = await fetch(`/api/properties/${property.id}/inspection-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: [{ start_time: startIso, end_time: endIso }],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }

      setSlotSuccess(true);
      setSlotDate('');
      setSlotStartTime('');
      setSlotEndTime('');
      setTimeout(() => setSlotSuccess(false), 2000);
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : 'Failed to add slot');
    } finally {
      setAddingSlots(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setCancellingBooking(bookingId);
    try {
      const res = await fetch(`/api/inspections/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (res.ok) {
        setInspectionBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
      }
    } catch {
      // Non-fatal
    } finally {
      setCancellingBooking(null);
    }
  }

  function handlePropertyChange(field: string, value: string | number | null) {
    setProperty((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setSaveError(null);
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

  async function handleSave() {
    if (!validateProperty()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
          county: property.county,
          property_type: property.property_type,
          total_sf: property.total_sf,
          land_area_sf: property.land_area_sf,
          year_built: property.year_built,
          zoning: property.zoning,
          parcel_number: property.parcel_number,
          parking_spaces: property.parking_spaces,
          parking_ratio: property.parking_ratio,
          power: property.power,
          clear_height_ft: property.clear_height_ft,
          dock_high_doors: property.dock_high_doors,
          grade_level_doors: property.grade_level_doors,
          levelers: property.levelers,
          crane_capacity_tons: property.crane_capacity_tons,
          description: property.description,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
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

  async function handleSaveUnit(unitId: string) {
    const edits = editingUnit[unitId];
    if (!edits) return;

    setSavingUnit(unitId);

    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }

      const { unit: updatedUnit } = await res.json();

      // Update local units state with the saved values
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId ? { ...u, ...updatedUnit, tenantName: u.tenantName } : u
        )
      );

      setExpandedUnit(null);
      router.refresh();
    } catch (err) {
      console.error('Unit save error:', err);
      // Keep expanded so the user can retry
    } finally {
      setSavingUnit(null);
    }
  }

  function handleCopyLink(url: string, qrId: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(qrId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const vacantUnits = units.filter((u) => u.status === 'vacant');

  // Analytics state
  const [analytics, setAnalytics] = useState<{
    totalViews: number;
    viewsLast30: number;
    qrScans: number;
    browseViews: number;
    otherViews: number;
    dailyBreakdown: { date: string; count: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/properties/${property.id}/analytics`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch {
        // Non-fatal
      } finally {
        setAnalyticsLoading(false);
      }
    }
    fetchAnalytics();
  }, [property.id]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <BackButton href="/properties" label="Back to Properties" />
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{property.name}</h1>
            <p className="mt-0.5 text-muted-foreground">
              {property.address}, {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <Button
            variant="secondary"
            icon={Printer}
            onClick={() => window.open(`/properties/${property.id}/print`, '_blank')}
          >
            Print Flyer
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Property Info Section                                              */}
      {/* ================================================================= */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Property Information</h2>
            <div className="flex items-center gap-3">
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
              <Button
                variant="primary"
                icon={saved ? Check : Save}
                onClick={handleSave}
                loading={saving}
              >
                {saved ? 'Saved' : saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setExpandedUnit(null)}
                          disabled={savingUnit === unit.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={savingUnit === unit.id}
                          onClick={() => handleSaveUnit(unit.id)}
                        >
                          {savingUnit === unit.id ? 'Saving...' : 'Save Unit'}
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

      {/* ================================================================= */}
      {/* Inspections / Tours Section                                        */}
      {/* ================================================================= */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Inspections & Tours
            </h2>
          </div>

          {/* Add Time Slot Form */}
          <div className="rounded-lg border border-border p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">Add Available Time Slot</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => { setSlotDate(e.target.value); setSlotError(null); }}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Start Time</label>
                <input
                  type="time"
                  value={slotStartTime}
                  onChange={(e) => { setSlotStartTime(e.target.value); setSlotError(null); }}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">End Time</label>
                <input
                  type="time"
                  value={slotEndTime}
                  onChange={(e) => { setSlotEndTime(e.target.value); setSlotError(null); }}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  icon={slotSuccess ? Check : Plus}
                  onClick={handleAddSlot}
                  loading={addingSlots}
                  className="w-full"
                >
                  {slotSuccess ? 'Added' : 'Add Slot'}
                </Button>
              </div>
            </div>
            {slotError && (
              <p className="mt-2 text-xs text-red-600">{slotError}</p>
            )}
          </div>

          {/* Upcoming Bookings */}
          <h3 className="text-sm font-medium mb-3">Upcoming Bookings</h3>
          {inspectionLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading bookings...
            </div>
          ) : inspectionBookings.filter((b) => b.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 text-sm">No upcoming tour bookings.</p>
              <p className="mt-1 text-xs">Add available time slots above and share the public property page to receive bookings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspectionBookings
                .filter((b) => b.status !== 'cancelled')
                .map((booking) => {
                  const slot = booking.inspection_slots;
                  const startDate = slot ? new Date(slot.start_time) : null;
                  const endDate = slot ? new Date(slot.end_time) : null;

                  return (
                    <div
                      key={booking.id}
                      className="flex items-start gap-4 rounded-lg border border-border p-4"
                    >
                      {/* Date badge */}
                      {startDate && (
                        <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 text-primary">
                          <span className="text-[10px] font-medium uppercase leading-none">
                            {startDate.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold leading-tight">
                            {startDate.getDate()}
                          </span>
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{booking.contact_name}</p>
                          <Badge status={booking.status} size="sm" />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {startDate && endDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {' – '}
                              {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {booking.contact_email}
                          </span>
                          {booking.contact_phone && (
                            <span>{booking.contact_phone}</span>
                          )}
                          {booking.company_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.company_name}
                            </span>
                          )}
                        </div>
                        {booking.message && (
                          <p className="mt-1.5 text-xs text-muted-foreground italic">
                            &ldquo;{booking.message}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Cancel action */}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingBooking === booking.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          {cancellingBooking === booking.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* Property Analytics                                                 */}
      {/* ================================================================= */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Analytics</h2>
          </div>

          {analyticsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading analytics...
            </div>
          ) : analytics ? (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Total Views</p>
                  <p className="mt-1 text-2xl font-bold">{analytics.totalViews}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Last 30 Days</p>
                  <p className="mt-1 text-2xl font-bold">{analytics.viewsLast30}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Browse Views</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{analytics.browseViews}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">QR Scans</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{analytics.qrScans}</p>
                </div>
              </div>

              {/* Daily views bar chart (CSS-only) */}
              {analytics.dailyBreakdown.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Views — Last 30 Days
                  </h3>
                  <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
                    {(() => {
                      const maxCount = Math.max(...analytics.dailyBreakdown.map((d) => d.count), 1);
                      return analytics.dailyBreakdown.map((day) => {
                        const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        const dateObj = new Date(day.date + 'T12:00:00');
                        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <div
                            key={day.date}
                            className="group relative flex-1"
                            style={{ height: '100%' }}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                              style={{
                                height: `${Math.max(heightPct, day.count > 0 ? 4 : 0)}%`,
                                minHeight: day.count > 0 ? 2 : 0,
                              }}
                            />
                            {/* Tooltip on hover */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                              <div className="whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-white shadow">
                                {label}: {day.count} view{day.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>
                      {new Date(analytics.dailyBreakdown[0]?.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span>
                      {new Date(analytics.dailyBreakdown[analytics.dailyBreakdown.length - 1]?.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 text-sm">No analytics data available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* Location Map                                                       */}
      {/* ================================================================= */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Location</h2>
          <div className="overflow-hidden rounded-lg">
            <iframe
              title={`Map of ${property.name}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.address}, ${property.city}, ${property.state} ${property.zip}`)}&output=embed`}
              className="h-[250px] w-full md:h-[300px]"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
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
