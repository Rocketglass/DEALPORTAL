import { createClient } from '@/lib/supabase/server';

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
