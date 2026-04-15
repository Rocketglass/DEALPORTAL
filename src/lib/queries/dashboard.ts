import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Pipeline Stats
// ---------------------------------------------------------------------------

export interface PipelineStage {
  label: string;
  statuses: { key: string; label: string; count: number; color: string }[];
  total: number;
}

export interface PipelineStats {
  applications: PipelineStage;
  lois: PipelineStage;
  leases: PipelineStage;
}

/**
 * Fetch deal pipeline counts broken down by status for applications, LOIs,
 * and leases. Used by the pipeline visualization on the dashboard.
 */
export async function getPipelineStats(): Promise<{
  data: PipelineStats | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const [appsRes, loisRes, leasesRes] = await Promise.all([
      supabase.from('applications').select('status'),
      supabase.from('lois').select('status'),
      supabase.from('leases').select('status'),
    ]);

    if (appsRes.error) throw appsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;

    const apps = appsRes.data || [];
    const lois = loisRes.data || [];
    const leases = leasesRes.data || [];

    const countBy = (arr: { status: string }[], status: string) =>
      arr.filter((r) => r.status === status).length;

    const data: PipelineStats = {
      applications: {
        label: 'Applications',
        total: apps.length,
        statuses: [
          { key: 'submitted', label: 'Submitted', count: countBy(apps, 'submitted'), color: '#3b82f6' },
          { key: 'under_review', label: 'Under Review', count: countBy(apps, 'under_review'), color: '#f59e0b' },
          { key: 'approved', label: 'Approved', count: countBy(apps, 'approved'), color: '#22c55e' },
        ],
      },
      lois: {
        label: 'LOIs',
        total: lois.length,
        statuses: [
          { key: 'draft', label: 'Draft', count: countBy(lois, 'draft'), color: '#94a3b8' },
          { key: 'sent', label: 'Sent', count: countBy(lois, 'sent'), color: '#3b82f6' },
          { key: 'in_negotiation', label: 'In Negotiation', count: countBy(lois, 'in_negotiation'), color: '#f59e0b' },
          { key: 'agreed', label: 'Agreed', count: countBy(lois, 'agreed'), color: '#22c55e' },
        ],
      },
      leases: {
        label: 'Leases',
        total: leases.length,
        statuses: [
          { key: 'draft', label: 'Draft', count: countBy(leases, 'draft'), color: '#94a3b8' },
          { key: 'sent_for_signature', label: 'Pending Signature', count: countBy(leases, 'sent_for_signature'), color: '#3b82f6' },
          { key: 'partially_signed', label: 'Partially Signed', count: countBy(leases, 'partially_signed'), color: '#f59e0b' },
          { key: 'executed', label: 'Executed', count: countBy(leases, 'executed'), color: '#22c55e' },
        ],
      },
    };

    return { data, error: null };
  } catch (err) {
    console.error('getPipelineStats error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Commission Summary
// ---------------------------------------------------------------------------

export interface CommissionSummary {
  earned: number;
  outstanding: number;
  pending: number;
  ytd: number;
}

/**
 * Aggregate commission amounts grouped by invoice status.
 * - earned:      sum of commission_amount where status = 'paid'
 * - outstanding: sum where status = 'sent' or 'overdue'
 * - pending:     sum where status = 'draft'
 * - ytd:         sum of all paid invoices created in the current calendar year
 */
export async function getCommissionSummary(): Promise<{
  data: CommissionSummary | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('commission_invoices')
      .select('status, commission_amount, paid_date, created_at');

    if (error) throw error;

    const rows = invoices || [];
    const currentYear = new Date().getFullYear();

    let earned = 0;
    let outstanding = 0;
    let pending = 0;
    let ytd = 0;

    for (const inv of rows) {
      const amt = inv.commission_amount ?? 0;
      if (inv.status === 'paid') {
        earned += amt;
        // YTD: check paid_date or fall back to created_at
        const refDate = inv.paid_date ?? inv.created_at;
        if (refDate && new Date(refDate).getFullYear() === currentYear) {
          ytd += amt;
        }
      } else if (inv.status === 'sent' || inv.status === 'overdue') {
        outstanding += amt;
      } else if (inv.status === 'draft') {
        pending += amt;
      }
    }

    return { data: { earned, outstanding, pending, ytd }, error: null };
  } catch (err) {
    console.error('getCommissionSummary error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Commission Timeline (last 12 months)
// ---------------------------------------------------------------------------

export interface CommissionTimelinePoint {
  month: string; // "Jan 2026", "Feb 2026"
  earned: number;
  outstanding: number;
}

/**
 * Build a 12-month commission timeline showing earned vs outstanding per month.
 */
export async function getCommissionTimeline(): Promise<{
  data: CommissionTimelinePoint[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const cutoff = twelveMonthsAgo.toISOString();

    const { data: invoices, error } = await supabase
      .from('commission_invoices')
      .select('status, commission_amount, paid_date, sent_date, created_at')
      .gte('created_at', cutoff);

    if (error) throw error;

    // Build a map for the last 12 months
    const monthMap = new Map<string, { earned: number; outstanding: number }>();
    const monthLabels: string[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthLabels.push(label);
      monthMap.set(label, { earned: 0, outstanding: 0 });
    }

    for (const inv of invoices || []) {
      const amt = inv.commission_amount ?? 0;
      if (amt === 0) continue;

      if (inv.status === 'paid') {
        const refDate = inv.paid_date ?? inv.created_at;
        if (!refDate) continue;
        const d = new Date(refDate);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const bucket = monthMap.get(label);
        if (bucket) bucket.earned += amt;
      } else if (inv.status === 'sent' || inv.status === 'overdue') {
        const refDate = inv.sent_date ?? inv.created_at;
        if (!refDate) continue;
        const d = new Date(refDate);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const bucket = monthMap.get(label);
        if (bucket) bucket.outstanding += amt;
      }
    }

    const data: CommissionTimelinePoint[] = monthLabels.map((month) => ({
      month,
      ...monthMap.get(month)!,
    }));

    return { data, error: null };
  } catch (err) {
    console.error('getCommissionTimeline error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Deal Flow Timeline (last 12 months)
// ---------------------------------------------------------------------------

export interface DealFlowTimelinePoint {
  month: string;
  applications: number;
  lois: number;
  leases: number;
}

/**
 * Count applications, LOIs, and leases created per month over the last 12 months.
 */
export async function getDealFlowTimeline(): Promise<{
  data: DealFlowTimelinePoint[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const cutoff = twelveMonthsAgo.toISOString();

    const [appsRes, loisRes, leasesRes] = await Promise.all([
      supabase.from('applications').select('created_at').gte('created_at', cutoff),
      supabase.from('lois').select('created_at').gte('created_at', cutoff),
      supabase.from('leases').select('created_at').gte('created_at', cutoff),
    ]);

    if (appsRes.error) throw appsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;

    // Build month buckets
    const monthMap = new Map<string, { applications: number; lois: number; leases: number }>();
    const monthLabels: string[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthLabels.push(label);
      monthMap.set(label, { applications: 0, lois: 0, leases: 0 });
    }

    const addToBucket = (rows: { created_at: string }[], key: 'applications' | 'lois' | 'leases') => {
      for (const row of rows) {
        if (!row.created_at) continue;
        const d = new Date(row.created_at);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const bucket = monthMap.get(label);
        if (bucket) bucket[key]++;
      }
    };

    addToBucket(appsRes.data || [], 'applications');
    addToBucket(loisRes.data || [], 'lois');
    addToBucket(leasesRes.data || [], 'leases');

    const data: DealFlowTimelinePoint[] = monthLabels.map((month) => ({
      month,
      ...monthMap.get(month)!,
    }));

    return { data, error: null };
  } catch (err) {
    console.error('getDealFlowTimeline error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Vacancy Intelligence
// ---------------------------------------------------------------------------

export interface VacancyIntelligence {
  expiring90: {
    unitId: string;
    suiteNumber: string;
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    daysUntilExpiry: number;
    tenantName: string;
    monthlyRent: number;
  }[];
  expiring180: {
    unitId: string;
    suiteNumber: string;
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    daysUntilExpiry: number;
    tenantName: string;
    monthlyRent: number;
  }[];
  vacantUnits: {
    unitId: string;
    suiteNumber: string;
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    sf: number;
    daysVacant: number;
  }[];
  stats: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    avgDaysOnMarket: number;
    avgLeaseTerm: number;
    avgRentPerSf: number;
  };
}

/**
 * Build vacancy intelligence data for the broker dashboard.
 * Analyses lease expirations, vacant units, and portfolio-wide stats.
 */
export async function getVacancyIntelligence(): Promise<{
  data: VacancyIntelligence | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Fetch all units with property info
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, property_id, suite_number, sf, status, current_lease_id, created_at, updated_at, property:properties!inner(id, name, address)');

    if (unitsError) throw unitsError;

    // Fetch all active/executed leases
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, unit_id, expiration_date, lessee_name, base_rent_monthly, premises_sf, term_months, status')
      .in('status', ['executed', 'sent_for_signature', 'partially_signed']);

    if (leasesError) throw leasesError;

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    // Build a map of unit_id -> lease for quick lookup
    const leaseByUnit = new Map<string, (typeof leases)[number]>();
    for (const lease of leases || []) {
      // Skip leases without a unit_id (external-address leases)
      if (!lease.unit_id) continue;
      // If a unit already has a lease mapped, keep the one expiring later
      const existing = leaseByUnit.get(lease.unit_id);
      if (!existing || new Date(lease.expiration_date) > new Date(existing.expiration_date)) {
        leaseByUnit.set(lease.unit_id, lease);
      }
    }

    const allUnits = units || [];
    const expiring90: VacancyIntelligence['expiring90'] = [];
    const expiring180: VacancyIntelligence['expiring180'] = [];
    const vacant: VacancyIntelligence['vacantUnits'] = [];

    let occupiedCount = 0;
    let vacantDaysSum = 0;
    let vacantCount = 0;
    let leaseTermSum = 0;
    let leaseTermCount = 0;
    let rentSfSum = 0;
    let rentSfCount = 0;

    for (const unit of allUnits) {
      const property = unit.property as unknown as { id: string; name: string; address: string };
      const lease = leaseByUnit.get(unit.id);

      if (unit.status === 'vacant' || (unit.status !== 'occupied' && unit.status !== 'pending' && !lease)) {
        // Vacant unit
        const refDate = unit.updated_at || unit.created_at;
        const daysVacant = Math.floor((now.getTime() - new Date(refDate).getTime()) / msPerDay);
        vacant.push({
          unitId: unit.id,
          suiteNumber: unit.suite_number,
          propertyId: property.id,
          propertyName: property.name,
          propertyAddress: property.address,
          sf: unit.sf,
          daysVacant: Math.max(0, daysVacant),
        });
        vacantDaysSum += Math.max(0, daysVacant);
        vacantCount++;
      } else if (lease) {
        occupiedCount++;

        // Calculate rent/sf for stats
        if (lease.base_rent_monthly > 0 && lease.premises_sf > 0) {
          rentSfSum += (lease.base_rent_monthly * 12) / lease.premises_sf;
          rentSfCount++;
        }

        // Calculate lease term for stats
        if (lease.term_months) {
          leaseTermSum += lease.term_months;
          leaseTermCount++;
        }

        // Check expiration
        const expirationDate = new Date(lease.expiration_date);
        const daysUntilExpiry = Math.floor((expirationDate.getTime() - now.getTime()) / msPerDay);

        if (daysUntilExpiry <= 180) {
          const entry = {
            unitId: unit.id,
            suiteNumber: unit.suite_number,
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            daysUntilExpiry,
            tenantName: lease.lessee_name,
            monthlyRent: lease.base_rent_monthly,
          };

          if (daysUntilExpiry <= 90) {
            expiring90.push(entry);
          } else {
            expiring180.push(entry);
          }
        }
      } else {
        // Unit with status occupied/pending but no active lease found — count as occupied
        occupiedCount++;
      }
    }

    // Sort by urgency (most urgent first; already expired = negative days = first)
    expiring90.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    expiring180.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    vacant.sort((a, b) => b.daysVacant - a.daysVacant);

    const totalUnits = allUnits.length;
    const data: VacancyIntelligence = {
      expiring90,
      expiring180,
      vacantUnits: vacant,
      stats: {
        totalUnits,
        occupiedUnits: occupiedCount,
        vacantUnits: vacantCount,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 1000) / 10 : 0,
        avgDaysOnMarket: vacantCount > 0 ? Math.round(vacantDaysSum / vacantCount) : 0,
        avgLeaseTerm: leaseTermCount > 0 ? Math.round(leaseTermSum / leaseTermCount) : 0,
        avgRentPerSf: rentSfCount > 0 ? Math.round((rentSfSum / rentSfCount) * 100) / 100 : 0,
      },
    };

    return { data, error: null };
  } catch (err) {
    console.error('getVacancyIntelligence error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Original Dashboard Stats
// ---------------------------------------------------------------------------

interface DashboardStats {
  applications: {
    total: number;
    submitted: number;
    under_review: number;
    approved: number;
  };
  lois: {
    total: number;
    draft: number;
    in_negotiation: number;
    agreed: number;
  };
  leases: {
    total: number;
    draft: number;
    sent_for_signature: number;
    executed: number;
  };
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
  };
}

interface RecentActivityItem {
  id: string;
  entity_type: 'application' | 'loi' | 'lease' | 'invoice';
  title: string;
  status: string;
  created_at: string;
}

/**
 * Fetch aggregate counts for the broker dashboard.
 * Returns totals and key status breakdowns for applications, LOIs, leases,
 * and invoices in a single round trip (four parallel queries).
 */
export async function getDashboardStats(): Promise<{
  data: DashboardStats | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Run all count queries in parallel
    const [applicationsRes, loisRes, leasesRes, invoicesRes] =
      await Promise.all([
        supabase.from('applications').select('status'),
        supabase.from('lois').select('status'),
        supabase.from('leases').select('status'),
        supabase.from('commission_invoices').select('status'),
      ]);

    if (applicationsRes.error) throw applicationsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;
    if (invoicesRes.error) throw invoicesRes.error;

    const apps = applicationsRes.data || [];
    const lois = loisRes.data || [];
    const leases = leasesRes.data || [];
    const invoices = invoicesRes.data || [];

    const stats: DashboardStats = {
      applications: {
        total: apps.length,
        submitted: apps.filter((a) => a.status === 'submitted').length,
        under_review: apps.filter((a) => a.status === 'under_review').length,
        approved: apps.filter((a) => a.status === 'approved').length,
      },
      lois: {
        total: lois.length,
        draft: lois.filter((l) => l.status === 'draft').length,
        in_negotiation: lois.filter((l) => l.status === 'in_negotiation')
          .length,
        agreed: lois.filter((l) => l.status === 'agreed').length,
      },
      leases: {
        total: leases.length,
        draft: leases.filter((l) => l.status === 'draft').length,
        sent_for_signature: leases.filter(
          (l) => l.status === 'sent_for_signature'
        ).length,
        executed: leases.filter((l) => l.status === 'executed').length,
      },
      invoices: {
        total: invoices.length,
        draft: invoices.filter((i) => i.status === 'draft').length,
        sent: invoices.filter((i) => i.status === 'sent').length,
        paid: invoices.filter((i) => i.status === 'paid').length,
        overdue: invoices.filter((i) => i.status === 'overdue').length,
      },
    };

    return { data: stats, error: null };
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch the most recent activity across all entity types.
 * Returns the 20 newest items (applications, LOIs, leases, invoices)
 * sorted by creation date, providing a unified activity feed for the dashboard.
 */
export async function getRecentActivity(): Promise<{
  data: RecentActivityItem[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const [appsRes, loisRes, leasesRes, invoicesRes] = await Promise.all([
      supabase
        .from('applications')
        .select('id, status, business_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('lois')
        .select('id, status, created_at, tenant:contacts!lois_tenant_contact_id_fkey(company_name)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('leases')
        .select('id, status, lessee_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('commission_invoices')
        .select('id, status, invoice_number, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (appsRes.error) throw appsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;
    if (invoicesRes.error) throw invoicesRes.error;

    const items: RecentActivityItem[] = [
      ...(appsRes.data || []).map((a) => ({
        id: a.id,
        entity_type: 'application' as const,
        title: a.business_name,
        status: a.status,
        created_at: a.created_at,
      })),
      ...(loisRes.data || []).map((l) => ({
        id: l.id,
        entity_type: 'loi' as const,
        title: `LOI — ${(l.tenant as unknown as { company_name: string | null })?.company_name ?? 'Unknown'}`,
        status: l.status,
        created_at: l.created_at,
      })),
      ...(leasesRes.data || []).map((l) => ({
        id: l.id,
        entity_type: 'lease' as const,
        title: l.lessee_name,
        status: l.status,
        created_at: l.created_at,
      })),
      ...(invoicesRes.data || []).map((i) => ({
        id: i.id,
        entity_type: 'invoice' as const,
        title: i.invoice_number,
        status: i.status,
        created_at: i.created_at,
      })),
    ];

    // Sort all items by date, newest first, and take top 20
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { data: items.slice(0, 20), error: null };
  } catch (err) {
    console.error('getRecentActivity error:', err);
    return { data: null, error: (err as Error).message };
  }
}
