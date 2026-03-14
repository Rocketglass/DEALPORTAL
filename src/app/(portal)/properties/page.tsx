'use client';

import Link from 'next/link';
import { Building2, Plus, MapPin, Settings } from 'lucide-react';
import type { Property } from '@/types/database';
import { formatSqft } from '@/lib/utils';

interface PropertyWithCounts extends Property {
  totalUnits: number;
  vacantUnits: number;
  occupiedUnits: number;
  pendingUnits: number;
}

const mockProperties: PropertyWithCounts[] = [
  {
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
    description: 'Multi-tenant industrial park in El Cajon with excellent freeway access.',
    features: [],
    photos: [],
    floorplan_url: null,
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    totalUnits: 8,
    vacantUnits: 1,
    occupiedUnits: 6,
    pendingUnits: 1,
  },
  {
    id: 'prop-2',
    name: 'Magnolia Business Park',
    address: '7890 Magnolia Ave',
    city: 'Santee',
    state: 'CA',
    zip: '92071',
    county: 'San Diego',
    property_type: 'commercial',
    total_sf: 32000,
    land_area_sf: 64000,
    year_built: 1995,
    zoning: 'CC',
    parcel_number: '384-210-15',
    parking_spaces: 60,
    parking_ratio: 1.88,
    power: '200A 3-Phase',
    clear_height_ft: 16,
    dock_high_doors: 2,
    grade_level_doors: 6,
    levelers: 0,
    crane_capacity_tons: null,
    building_far: null,
    primary_leasing_company: 'Rocket Glass CCIM',
    description: 'Mixed commercial park with retail and office suites.',
    features: [],
    photos: [],
    floorplan_url: null,
    is_active: true,
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-07-20T00:00:00Z',
    totalUnits: 6,
    vacantUnits: 2,
    occupiedUnits: 4,
    pendingUnits: 0,
  },
  {
    id: 'prop-3',
    name: 'Fletcher Hills Office Center',
    address: '2100 Fletcher Pkwy',
    city: 'El Cajon',
    state: 'CA',
    zip: '92020',
    county: 'San Diego',
    property_type: 'office',
    total_sf: 18500,
    land_area_sf: 28000,
    year_built: 2002,
    zoning: 'CO',
    parcel_number: '483-350-22',
    parking_spaces: 45,
    parking_ratio: 2.43,
    power: '200A Single-Phase',
    clear_height_ft: 10,
    dock_high_doors: 0,
    grade_level_doors: 0,
    levelers: 0,
    crane_capacity_tons: null,
    building_far: null,
    primary_leasing_company: 'Rocket Glass CCIM',
    description: 'Professional office center near Fletcher Hills shopping.',
    features: [],
    photos: [],
    floorplan_url: null,
    is_active: true,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-08-15T00:00:00Z',
    totalUnits: 5,
    vacantUnits: 0,
    occupiedUnits: 5,
    pendingUnits: 0,
  },
];

const typeColors: Record<string, string> = {
  industrial: 'bg-blue-100 text-blue-700',
  commercial: 'bg-purple-100 text-purple-700',
  retail: 'bg-amber-100 text-amber-700',
  office: 'bg-green-100 text-green-700',
  mixed: 'bg-gray-100 text-gray-700',
};

export default function PropertiesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your property portfolio and units.
          </p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Properties</p>
          <p className="mt-1 text-3xl font-bold">{mockProperties.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Units</p>
          <p className="mt-1 text-3xl font-bold">
            {mockProperties.reduce((sum, p) => sum + p.totalUnits, 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Vacant Units</p>
          <p className="mt-1 text-3xl font-bold text-success">
            {mockProperties.reduce((sum, p) => sum + p.vacantUnits, 0)}
          </p>
        </div>
      </div>

      {/* Properties table */}
      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Size</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Total Units</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Occupied</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Vacant</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {mockProperties.map((property) => (
              <tr
                key={property.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{property.name}</div>
                  <div className="text-xs text-muted-foreground">{property.address}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.city}, {property.state}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      typeColors[property.property_type] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {property.property_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {property.total_sf ? formatSqft(property.total_sf) : '--'}
                </td>
                <td className="px-4 py-3 text-center font-medium">{property.totalUnits}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-blue-600 font-medium">{property.occupiedUnits}</span>
                  {property.pendingUnits > 0 && (
                    <span className="ml-1 text-xs text-amber-600">+{property.pendingUnits} pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={property.vacantUnits > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                    {property.vacantUnits}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/properties/${property.id}`}
                    className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
