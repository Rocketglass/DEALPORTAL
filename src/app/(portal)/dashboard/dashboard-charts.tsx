'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type {
  CommissionTimelinePoint,
  DealFlowTimelinePoint,
} from '@/lib/queries/dashboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangeOption = '6M' | '12M' | 'All';

interface DashboardChartsProps {
  commissionTimeline: CommissionTimelinePoint[];
  dealFlowTimeline: DealFlowTimelinePoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function sliceByRange<T>(data: T[], range: RangeOption): T[] {
  if (range === 'All') return data;
  const months = range === '6M' ? 6 : 12;
  return data.slice(-months);
}

// ---------------------------------------------------------------------------
// Range Selector
// ---------------------------------------------------------------------------

function RangeSelector({
  value,
  onChange,
}: {
  value: RangeOption;
  onChange: (v: RangeOption) => void;
}) {
  const options: RangeOption[] = ['6M', '12M', 'All'];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === opt
              ? 'bg-[#1e40af] text-white'
              : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip Components
// ---------------------------------------------------------------------------

function CommissionTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-[#0f172a]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

function DealFlowTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-[#0f172a]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardCharts({
  commissionTimeline,
  dealFlowTimeline,
}: DashboardChartsProps) {
  const [range, setRange] = useState<RangeOption>('12M');

  const filteredCommission = useMemo(
    () => sliceByRange(commissionTimeline, range),
    [commissionTimeline, range],
  );

  const filteredDealFlow = useMemo(
    () => sliceByRange(dealFlowTimeline, range),
    [dealFlowTimeline, range],
  );

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0f172a]">Analytics</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Commission Revenue Chart */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Commission Revenue
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Monthly breakdown — earned vs outstanding
            </p>
            <div className="mt-4 h-72" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredCommission}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    content={<CommissionTooltip />}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#64748b' }}
                  />
                  <Bar
                    dataKey="earned"
                    name="Earned"
                    stackId="commission"
                    fill="#22c55e"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="outstanding"
                    name="Outstanding"
                    stackId="commission"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deal Flow Trends Chart */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Deal Flow Trends
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Monthly new applications, LOIs, and leases
            </p>
            <div className="mt-4 h-72" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredDealFlow}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLois" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLeases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<DealFlowTooltip />}
                    cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#64748b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications"
                    stackId="dealflow"
                    stroke="#3b82f6"
                    fill="url(#gradApplications)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="lois"
                    name="LOIs"
                    stackId="dealflow"
                    stroke="#f59e0b"
                    fill="url(#gradLois)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="leases"
                    name="Leases"
                    stackId="dealflow"
                    stroke="#22c55e"
                    fill="url(#gradLeases)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
