import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyAnalytics {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  qrScans: number;
  portalViews: number;
  applications: number;
  lois: number;
  leases: number;
  conversionRate: number; // applications / (qrScans + portalViews) * 100, or 0
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch analytics metrics for every active property.
 *
 * For each property we count:
 *   - qrScans:     property_views where source = 'qr_scan'
 *   - portalViews: property_views where source != 'qr_scan' (browse + other)
 *   - applications, lois, leases: straight counts by property_id
 *
 * Results are returned sorted by total interactions (desc).
 */
export async function getPropertyAnalytics(): Promise<{
  data: PropertyAnalytics[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Fetch all data in parallel
    const [propertiesRes, viewsRes, appsRes, loisRes, leasesRes] =
      await Promise.all([
        supabase
          .from('properties')
          .select('id, name, address')
          .eq('is_active', true)
          .order('name'),
        supabase.from('property_views').select('property_id, source'),
        supabase.from('applications').select('property_id'),
        supabase.from('lois').select('property_id'),
        supabase.from('leases').select('property_id'),
      ]);

    if (propertiesRes.error) throw propertiesRes.error;
    if (viewsRes.error) throw viewsRes.error;
    if (appsRes.error) throw appsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;

    const properties = propertiesRes.data ?? [];
    const views = viewsRes.data ?? [];
    const apps = appsRes.data ?? [];
    const lois = loisRes.data ?? [];
    const leases = leasesRes.data ?? [];

    // Build count maps
    const qrScanMap = new Map<string, number>();
    const portalViewMap = new Map<string, number>();

    for (const v of views) {
      if (v.source === 'qr_scan') {
        qrScanMap.set(v.property_id, (qrScanMap.get(v.property_id) ?? 0) + 1);
      } else {
        portalViewMap.set(v.property_id, (portalViewMap.get(v.property_id) ?? 0) + 1);
      }
    }

    const countMap = (rows: { property_id: string }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        m.set(r.property_id, (m.get(r.property_id) ?? 0) + 1);
      }
      return m;
    };

    const appMap = countMap(apps);
    const loiMap = countMap(lois);
    const leaseMap = countMap(leases);

    // Assemble per-property analytics
    const data: PropertyAnalytics[] = properties.map((p) => {
      const qrScans = qrScanMap.get(p.id) ?? 0;
      const portalViews = portalViewMap.get(p.id) ?? 0;
      const applications = appMap.get(p.id) ?? 0;
      const loisCount = loiMap.get(p.id) ?? 0;
      const leasesCount = leaseMap.get(p.id) ?? 0;
      const totalImpressions = qrScans + portalViews;
      const conversionRate =
        totalImpressions > 0
          ? Math.round((applications / totalImpressions) * 10000) / 100
          : 0;

      return {
        propertyId: p.id,
        propertyName: p.name,
        propertyAddress: p.address,
        qrScans,
        portalViews,
        applications,
        lois: loisCount,
        leases: leasesCount,
        conversionRate,
      };
    });

    // Sort by total interactions descending
    data.sort((a, b) => {
      const totalA = a.qrScans + a.portalViews + a.applications + a.lois + a.leases;
      const totalB = b.qrScans + b.portalViews + b.applications + b.lois + b.leases;
      return totalB - totalA;
    });

    return { data, error: null };
  } catch (err) {
    console.error('getPropertyAnalytics error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Single-property analytics (for the detail page)
// ---------------------------------------------------------------------------

export interface SinglePropertyAnalytics {
  applications: number;
  lois: number;
  leases: number;
}

/**
 * Fetch application / LOI / lease counts for a single property.
 */
export async function getPropertyDealCounts(
  propertyId: string
): Promise<{ data: SinglePropertyAnalytics | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const [appsRes, loisRes, leasesRes] = await Promise.all([
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId),
      supabase
        .from('lois')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId),
      supabase
        .from('leases')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId),
    ]);

    if (appsRes.error) throw appsRes.error;
    if (loisRes.error) throw loisRes.error;
    if (leasesRes.error) throw leasesRes.error;

    return {
      data: {
        applications: appsRes.count ?? 0,
        lois: loisRes.count ?? 0,
        leases: leasesRes.count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('getPropertyDealCounts error:', err);
    return { data: null, error: (err as Error).message };
  }
}
