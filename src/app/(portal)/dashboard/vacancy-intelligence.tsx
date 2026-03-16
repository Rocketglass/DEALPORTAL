'use client';

import Link from 'next/link';
import { Building2, Clock, BarChart3, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { VacancyIntelligence } from '@/lib/queries/dashboard';

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const rentSfFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-US');

function occupancyColor(rate: number): string {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function occupancyBg(rate: number): string {
  if (rate >= 90) return 'bg-green-50';
  if (rate >= 70) return 'bg-amber-50';
  return 'bg-red-50';
}

function expiryBadge(days: number): { label: string; classes: string } {
  if (days < 0) {
    return {
      label: `Expired — ${Math.abs(days)}d over`,
      classes: 'bg-red-100 text-red-700',
    };
  }
  if (days < 30) {
    return {
      label: `${days}d`,
      classes: 'bg-red-100 text-red-700',
    };
  }
  if (days <= 90) {
    return {
      label: `${days}d`,
      classes: 'bg-amber-100 text-amber-700',
    };
  }
  return {
    label: `${days}d`,
    classes: 'bg-blue-100 text-blue-700',
  };
}

export default function VacancyIntelligenceSection({
  data,
}: {
  data: VacancyIntelligence;
}) {
  const { stats, expiring90, expiring180, vacantUnits } = data;

  // Merge expiring90 and expiring180 into a single sorted list for the table
  const allExpiring = [...expiring90, ...expiring180].sort(
    (a, b) => a.daysUntilExpiry - b.daysUntilExpiry,
  );

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">
          Vacancy Intelligence
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Portfolio occupancy, lease expirations, and vacant unit tracking.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy Rate */}
        <Card className="transition-shadow duration-150 hover:shadow-md">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${occupancyBg(stats.occupancyRate)}`}
              >
                <BarChart3
                  className={`h-4 w-4 ${occupancyColor(stats.occupancyRate)}`}
                />
              </div>
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${occupancyColor(stats.occupancyRate)}`}
            >
              {stats.occupancyRate}%
            </p>
            <p className="mt-0.5 text-xs text-[#64748b]">
              {stats.occupiedUnits} of {stats.totalUnits} units occupied
            </p>
          </CardContent>
        </Card>

        {/* Vacant Units */}
        <Card className="transition-shadow duration-150 hover:shadow-md">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Vacant Units</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                <Building2 className="h-4 w-4 text-slate-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {stats.vacantUnits}
            </p>
            <p className="mt-0.5 text-xs text-[#64748b]">
              of {stats.totalUnits} total units
            </p>
          </CardContent>
        </Card>

        {/* Avg Days on Market */}
        <Card className="transition-shadow duration-150 hover:shadow-md">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Avg Days on Market
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {stats.avgDaysOnMarket}
            </p>
            <p className="mt-0.5 text-xs text-[#64748b]">
              days for vacant units
            </p>
          </CardContent>
        </Card>

        {/* Avg Rent/SF */}
        <Card className="transition-shadow duration-150 hover:shadow-md">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avg Rent/SF</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0f172a]">
              {rentSfFmt.format(stats.avgRentPerSf)}
            </p>
            <p className="mt-0.5 text-xs text-[#64748b]">
              annualized per sq ft
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vacancy Risk Table */}
      {allExpiring.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-[#0f172a]">
              Vacancy Risk
            </h3>
            <p className="mt-1 text-sm text-[#64748b]">
              Leases expiring within 180 days, sorted by urgency.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Property
                    </th>
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Suite
                    </th>
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Tenant
                    </th>
                    <th className="pb-3 pr-4 text-right font-medium text-[#64748b]">
                      Rent
                    </th>
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Expires In
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {allExpiring.map((unit) => {
                    const badge = expiryBadge(unit.daysUntilExpiry);
                    return (
                      <tr
                        key={unit.unitId}
                        className="group transition-colors hover:bg-[#f8fafc]"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/properties/${unit.propertyId}`}
                            className="font-medium text-[#0f172a] hover:text-[#1e40af] hover:underline"
                          >
                            {unit.propertyName}
                          </Link>
                          <p className="mt-0.5 text-xs text-[#94a3b8]">
                            {unit.propertyAddress}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-[#0f172a]">
                          {unit.suiteNumber}
                        </td>
                        <td className="py-3 pr-4 text-[#0f172a]">
                          {unit.tenantName}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-[#0f172a]">
                          {currencyFmt.format(unit.monthlyRent)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vacant Units Table */}
      {vacantUnits.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-[#0f172a]">
              Vacant Units
            </h3>
            <p className="mt-1 text-sm text-[#64748b]">
              Units currently available, sorted by time on market.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Property
                    </th>
                    <th className="pb-3 pr-4 font-medium text-[#64748b]">
                      Suite
                    </th>
                    <th className="pb-3 pr-4 text-right font-medium text-[#64748b]">
                      SF
                    </th>
                    <th className="pb-3 pr-4 text-right font-medium text-[#64748b]">
                      Days Vacant
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {vacantUnits.map((unit) => (
                    <tr
                      key={unit.unitId}
                      className="group transition-colors hover:bg-[#f8fafc]"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/properties/${unit.propertyId}`}
                          className="font-medium text-[#0f172a] hover:text-[#1e40af] hover:underline"
                        >
                          {unit.propertyName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#94a3b8]">
                          {unit.propertyAddress}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-[#0f172a]">
                        {unit.suiteNumber}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[#0f172a]">
                        {numberFmt.format(unit.sf)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[#0f172a]">
                        {unit.daysVacant}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
