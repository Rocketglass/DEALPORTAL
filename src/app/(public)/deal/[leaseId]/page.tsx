import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { formatCurrency, formatDate, formatSqft, formatPerSqft } from '@/lib/utils';
import type { Metadata } from 'next';

// ============================================================
// Service client (no auth — public page)
// ============================================================

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// ============================================================
// Data fetching
// ============================================================

interface LeaseRow {
  id: string;
  status: string;
  premises_sf: number;
  base_rent_monthly: number;
  term_months: number | null;
  term_years: number | null;
  commencement_date: string;
  expiration_date: string;
  lessee_name: string;
  lessor_name: string;
  property: {
    name: string;
    address: string;
    city: string;
    state: string;
    property_type: string;
  } | null;
  unit: {
    suite_number: string;
    sf: number;
  } | null;
  tenant: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  landlord: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  broker: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CommissionRow {
  commission_rate_percent: number;
  commission_amount: number;
  total_consideration: number;
}

async function fetchLease(leaseId: string) {
  const supabase = getServiceClient();

  const { data: lease, error } = await supabase
    .from('leases')
    .select(
      `*,
      property:properties(name, address, city, state, property_type),
      unit:units(suite_number, sf),
      tenant:contacts!leases_tenant_contact_id_fkey(company_name, first_name, last_name),
      landlord:contacts!leases_landlord_contact_id_fkey(company_name, first_name, last_name),
      broker:contacts!leases_broker_contact_id_fkey(company_name, first_name, last_name)`
    )
    .eq('id', leaseId)
    .single();

  if (error || !lease) return null;
  return lease as LeaseRow;
}

async function fetchCommission(leaseId: string) {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from('commission_invoices')
    .select('commission_rate_percent, commission_amount, total_consideration')
    .eq('lease_id', leaseId)
    .maybeSingle();

  return data as CommissionRow | null;
}

// ============================================================
// Helpers
// ============================================================

function contactName(contact: { company_name: string | null; first_name: string | null; last_name: string | null } | null): string {
  if (!contact) return '--';
  if (contact.company_name) return contact.company_name;
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '--';
}

function getTermMonths(lease: LeaseRow): number {
  if (lease.term_months) return lease.term_months;
  if (lease.term_years) return lease.term_years * 12;
  return 0;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  review: 'In Review',
  sent_for_signature: 'Sent for Signature',
  partially_signed: 'Partially Signed',
  executed: 'Executed',
  expired: 'Expired',
  terminated: 'Terminated',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-blue-100 text-blue-700',
  sent_for_signature: 'bg-amber-100 text-amber-700',
  partially_signed: 'bg-orange-100 text-orange-700',
  executed: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
};

// ============================================================
// OG Metadata
// ============================================================

interface Props {
  params: Promise<{ leaseId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { leaseId } = await params;
  const lease = await fetchLease(leaseId);

  if (!lease) {
    return { title: 'Deal Not Found | Rocket Realty' };
  }

  const propertyAddress = lease.property
    ? `${lease.property.address}, ${lease.property.city}`
    : lease.lessee_name;
  const tenantName = contactName(lease.tenant);
  const sf = lease.premises_sf ? formatNumber(lease.premises_sf) : '';
  const termMonths = getTermMonths(lease);

  return {
    title: `Deal Summary — ${propertyAddress}`,
    description: `${tenantName} lease at ${propertyAddress} — ${sf} SF, ${termMonths} months`,
    openGraph: {
      title: `Deal Summary — ${propertyAddress}`,
      description: `${tenantName} lease at ${propertyAddress} — ${sf} SF, ${termMonths} months`,
      type: 'website',
    },
  };
}

// ============================================================
// Page Component
// ============================================================

export default async function DealSummaryPage({ params }: Props) {
  const { leaseId } = await params;
  const [lease, commission] = await Promise.all([
    fetchLease(leaseId),
    fetchCommission(leaseId),
  ]);

  if (!lease) notFound();

  const property = lease.property;
  const unit = lease.unit;
  const termMonths = getTermMonths(lease);
  const sf = unit?.sf ?? lease.premises_sf;
  const rentPerSf = sf > 0 ? lease.base_rent_monthly / sf : null;
  const totalLeaseValue = commission?.total_consideration ?? lease.base_rent_monthly * termMonths;
  const commissionRate = commission?.commission_rate_percent ?? 6;
  const commissionAmount = commission?.commission_amount ?? totalLeaseValue * (commissionRate / 100);

  return (
    <>
      {/* Print-friendly styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .deal-summary { box-shadow: none !important; max-width: 100% !important; margin: 0 !important; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12 sm:px-6">
        <div className="deal-summary mx-auto max-w-2xl bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e40af] px-6 py-6 sm:px-8">
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight">
              ROCKET REALTY
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">
              Commercial Real Estate Brokerage
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-8">
            {/* Title */}
            <h2 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
              Deal Summary
            </h2>

            {/* Property Section */}
            <div className="space-y-3 mb-6">
              <DetailRow
                label="Property"
                value={
                  property ? (
                    <div>
                      <div className="font-medium">{property.address}</div>
                      <div className="text-slate-500 text-sm">
                        {property.city}, {property.state}
                      </div>
                    </div>
                  ) : (
                    '--'
                  )
                }
              />
              {unit?.suite_number && (
                <DetailRow label="Suite" value={unit.suite_number} />
              )}
              {property?.property_type && (
                <DetailRow
                  label="Type"
                  value={
                    <span className="capitalize">{property.property_type}</span>
                  }
                />
              )}
            </div>

            <Divider />

            {/* Parties Section */}
            <div className="space-y-3 mb-6">
              <DetailRow label="Tenant" value={lease.lessee_name || contactName(lease.tenant)} />
              <DetailRow label="Landlord" value={lease.lessor_name || contactName(lease.landlord)} />
            </div>

            <Divider />

            {/* Lease Terms Section */}
            <div className="space-y-3 mb-6">
              <DetailRow
                label="Square Feet"
                value={
                  <span className="font-semibold">
                    {formatNumber(sf)} SF
                  </span>
                }
              />
              {rentPerSf != null && (
                <DetailRow
                  label="Base Rent"
                  value={formatPerSqft(rentPerSf)}
                />
              )}
              <DetailRow
                label="Monthly Rent"
                value={
                  <span className="font-semibold">
                    {formatCurrency(lease.base_rent_monthly)}/mo
                  </span>
                }
              />
              <DetailRow
                label="Term"
                value={`${termMonths} months`}
              />
              <DetailRow
                label="Commencement"
                value={formatDate(lease.commencement_date)}
              />
              <DetailRow
                label="Expiration"
                value={formatDate(lease.expiration_date)}
              />
            </div>

            <Divider />

            {/* Financial Summary */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-500">Total Lease Value</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(totalLeaseValue)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-500">Commission Rate</span>
                <span className="text-base font-semibold text-slate-700">
                  {commissionRate}%
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-500">Commission</span>
                <span className="text-xl font-bold text-[#1e40af]">
                  {formatCurrency(commissionAmount)}
                </span>
              </div>
            </div>

            <Divider />

            {/* Footer Info */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[lease.status] || 'bg-gray-100 text-gray-700'}`}
                >
                  {statusLabels[lease.status] || lease.status.replace(/_/g, ' ')}
                </span>
              </div>
              <DetailRow
                label="Broker"
                value={contactName(lease.broker)}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-100 px-6 py-4 sm:px-8">
            <p className="text-xs text-slate-400 text-center">
              Rocket Realty &middot; San Diego, CA
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Sub-components (inline for public page — no shared imports)
// ============================================================

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 text-right">{value || '--'}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 my-6" />;
}
