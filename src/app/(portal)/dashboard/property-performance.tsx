'use client';

import Link from 'next/link';
import type { PropertyAnalytics } from '@/lib/queries/property-analytics';

interface PropertyPerformanceProps {
  analytics: PropertyAnalytics[];
}

export default function PropertyPerformance({ analytics }: PropertyPerformanceProps) {
  if (analytics.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No property data available yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e2e8f0]">
            <th className="pb-3 pr-4 text-xs font-medium text-[#64748b]">Property</th>
            <th className="pb-3 px-4 text-xs font-medium text-[#64748b] text-right">QR Scans</th>
            <th className="pb-3 px-4 text-xs font-medium text-[#64748b] text-right">Views</th>
            <th className="pb-3 px-4 text-xs font-medium text-[#64748b] text-right">Applications</th>
            <th className="pb-3 px-4 text-xs font-medium text-[#64748b] text-right">LOIs</th>
            <th className="pb-3 px-4 text-xs font-medium text-[#64748b] text-right">Leases</th>
            <th className="pb-3 pl-4 text-xs font-medium text-[#64748b] text-right">Conversion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f5f9]">
          {analytics.map((row) => {
            const total =
              row.qrScans + row.portalViews + row.applications + row.lois + row.leases;

            return (
              <tr key={row.propertyId} className="group hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 pr-4">
                  <Link
                    href={`/properties/${row.propertyId}`}
                    className="text-sm font-medium text-[#1e40af] hover:underline"
                  >
                    {row.propertyName}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#64748b] truncate max-w-[240px]">
                    {row.propertyAddress}
                  </p>
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#0f172a]">
                  {row.qrScans}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#0f172a]">
                  {row.portalViews}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#0f172a]">
                  {row.applications}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#0f172a]">
                  {row.lois}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#0f172a]">
                  {row.leases}
                </td>
                <td className="py-3 pl-4 text-right">
                  {total > 0 ? (
                    <span className="tabular-nums text-[#0f172a]">
                      {row.conversionRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[#94a3b8]">&mdash;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
