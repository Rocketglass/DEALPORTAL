import { createClient } from '@/lib/supabase/server';
import type {
  ApplicationStatus,
  LoiStatus,
  LoiSectionStatus,
  LeaseStatus,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TenantApplicationWithDeal {
  id: string;
  businessName: string;
  propertyName: string;
  suiteName: string | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  reviewNotes: string | null;
  loi: {
    id: string;
    status: LoiStatus;
    sentAt: string | null;
    agreedAt: string | null;
    sections: { key: string; status: LoiSectionStatus }[];
  } | null;
  lease: {
    id: string;
    status: LeaseStatus;
    docusignStatus: string | null;
    signedDate: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch all applications for a tenant by contact ID, with associated LOI
 * (including section-level status) and lease progress.
 *
 * Agent delegation: callers should pass `user.principalId ?? user.contactId`
 * so that tenant agents see their principal's applications.
 *
 * Avoids N+1 queries by batch-fetching LOIs and leases for all application IDs,
 * then mapping results into the clean TenantApplicationWithDeal shape.
 */
export async function getTenantApplications(contactId: string | null): Promise<{
  data: TenantApplicationWithDeal[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 1. Fetch applications with property and unit joins
    let appsQuery = supabase
      .from('applications')
      .select(`
        id,
        business_name,
        status,
        submitted_at,
        created_at,
        contact_id,
        review_notes,
        property:properties(id, name),
        unit:units(id, suite_number)
      `)
      .order('created_at', { ascending: false });

    // When contactId is null (broker/admin), skip the contact filter — return all applications
    if (contactId) {
      appsQuery = appsQuery.eq('contact_id', contactId);
    }

    const { data: applications, error: appsError } = await appsQuery;

    if (appsError) throw appsError;
    if (!applications || applications.length === 0) {
      return { data: [], error: null };
    }

    const appIds = applications.map((a) => a.id);

    // 2. Batch-fetch LOIs for all application IDs (with sections)
    const { data: lois, error: loisError } = await supabase
      .from('lois')
      .select(`
        id,
        application_id,
        status,
        sent_at,
        agreed_at,
        sections:loi_sections(id, section_key, status)
      `)
      .in('application_id', appIds);

    if (loisError) throw loisError;

    // 3. Batch-fetch leases for all application IDs
    // Leases link to LOIs, not applications directly. We join via loi_id from our fetched LOIs.
    const loiIds = (lois ?? []).map((l) => l.id);
    let leases: Array<{
      id: string;
      loi_id: string | null;
      status: string;
      docusign_status: string | null;
      signed_date: string | null;
    }> = [];

    if (loiIds.length > 0) {
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select('id, loi_id, status, docusign_status, signed_date')
        .in('loi_id', loiIds);

      if (leasesError) throw leasesError;
      leases = (leasesData ?? []) as typeof leases;
    }

    // 4. Build lookup maps for efficient joining
    const loiByAppId = new Map<string, (typeof lois)[number]>();
    for (const loi of lois ?? []) {
      if (loi.application_id) {
        loiByAppId.set(loi.application_id, loi);
      }
    }

    const leaseByLoiId = new Map<string, (typeof leases)[number]>();
    for (const lease of leases) {
      if (lease.loi_id) {
        leaseByLoiId.set(lease.loi_id, lease);
      }
    }

    // 5. Map into clean TenantApplicationWithDeal shape
    const result: TenantApplicationWithDeal[] = applications.map((app) => {
      // Supabase returns related rows as arrays when using foreign key joins
      const propertyArr = app.property as { id: string; name: string }[] | null;
      const property = Array.isArray(propertyArr) ? propertyArr[0] ?? null : (propertyArr as unknown as { id: string; name: string } | null);
      const unitArr = app.unit as { id: string; suite_number: string }[] | null;
      const unit = Array.isArray(unitArr) ? unitArr[0] ?? null : (unitArr as unknown as { id: string; suite_number: string } | null);
      const loi = loiByAppId.get(app.id) ?? null;
      const lease = loi ? leaseByLoiId.get(loi.id) ?? null : null;

      return {
        id: app.id,
        businessName: app.business_name,
        propertyName: property?.name ?? 'General Application',
        suiteName: unit?.suite_number ?? null,
        status: app.status as ApplicationStatus,
        submittedAt: app.submitted_at,
        createdAt: app.created_at,
        reviewNotes: app.review_notes as string | null ?? null,
        loi: loi
          ? {
              id: loi.id,
              status: loi.status as LoiStatus,
              sentAt: loi.sent_at,
              agreedAt: loi.agreed_at,
              sections: (loi.sections ?? []).map((s) => ({
                key: s.section_key,
                status: s.status as LoiSectionStatus,
              })),
            }
          : null,
        lease: lease
          ? {
              id: lease.id,
              status: lease.status as LeaseStatus,
              docusignStatus: lease.docusign_status,
              signedDate: lease.signed_date,
            }
          : null,
      };
    });

    return { data: result, error: null };
  } catch (err) {
    console.error('getTenantApplications error:', err);
    return { data: null, error: (err as Error).message };
  }
}
