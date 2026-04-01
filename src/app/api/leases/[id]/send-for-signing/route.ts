/**
 * POST /api/leases/[id]/send-for-signing
 *
 * Sends a lease for e-signature via DocuSign.
 * Requires authenticated broker/admin user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEnvelope, isDocuSignConfigured } from '@/lib/docusign/client';
import type { LeaseWithRelations } from '@/types/database';
import { notifyLeaseReadyForSignature } from '@/lib/email/notifications';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    if (!isDocuSignConfigured()) {
      return NextResponse.json(
        { error: 'DocuSign is not configured. Contact your administrator.' },
        { status: 503 },
      );
    }

    // Require broker or admin role
    let currentUser;
    try {
      currentUser = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Fetch lease with relations
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        unit:units!leases_unit_id_fkey(*),
        tenant:contacts!leases_tenant_contact_id_fkey(*),
        landlord:contacts!leases_landlord_contact_id_fkey(*),
        broker:contacts!leases_broker_contact_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    const typedLease = lease as LeaseWithRelations;

    // Validate lease is in a sendable state
    if (!['draft', 'review'].includes(typedLease.status)) {
      return NextResponse.json(
        { error: `Cannot send lease in '${typedLease.status}' status. Must be 'draft' or 'review'.` },
        { status: 400 },
      );
    }

    // Validate required contact emails
    const tenantEmail = typedLease.tenant?.email;
    const landlordEmail = typedLease.landlord?.email;
    if (!tenantEmail) {
      return NextResponse.json({ error: 'Tenant contact has no email address.' }, { status: 400 });
    }
    if (!landlordEmail) {
      return NextResponse.json({ error: 'Landlord contact has no email address.' }, { status: 400 });
    }

    // Get the lease PDF
    // For now, if there's a lease_pdf_url, download it; otherwise return error
    if (!typedLease.lease_pdf_url) {
      return NextResponse.json(
        { error: 'No lease PDF uploaded. Generate or upload a lease PDF before sending for signature.' },
        { status: 400 },
      );
    }

    // Download the PDF from storage
    const pdfResponse = await fetch(typedLease.lease_pdf_url);
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to download lease PDF.' }, { status: 500 });
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // Build signer names
    const tenantName = typedLease.tenant?.company_name
      || [typedLease.tenant?.first_name, typedLease.tenant?.last_name].filter(Boolean).join(' ')
      || typedLease.lessee_name;

    const landlordName = typedLease.landlord?.company_name
      || [typedLease.landlord?.first_name, typedLease.landlord?.last_name].filter(Boolean).join(' ')
      || typedLease.lessor_name;

    // Create DocuSign envelope
    const envelopeResponse = await createEnvelope(
      {
        ...typedLease,
        tenant_email: tenantEmail,
        tenant_name: tenantName,
        landlord_email: landlordEmail,
        landlord_name: landlordName,
      },
      pdfBase64,
    );

    // Update lease with DocuSign envelope info
    await supabase
      .from('leases')
      .update({
        status: 'sent_for_signature',
        docusign_envelope_id: envelopeResponse.envelopeId,
        docusign_status: envelopeResponse.status,
        sent_for_signature_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: currentUser.id,
      action: 'lease_sent_for_signature',
      entity_type: 'lease',
      entity_id: id,
      new_value: {
        envelope_id: envelopeResponse.envelopeId,
        tenant_email: tenantEmail,
        landlord_email: landlordEmail,
      },
    });

    // Notify all signers that the lease is ready for their signature
    void notifyLeaseReadyForSignature(
      {
        id: typedLease.id,
        propertyAddress: typedLease.premises_address,
        suiteNumber: typedLease.unit?.suite_number ?? '',
        tenantBusinessName: typedLease.lessee_name,
        commencementDate: typedLease.commencement_date,
      },
      [
        { email: tenantEmail, name: tenantName, role: 'tenant' },
        { email: landlordEmail, name: landlordName, role: 'landlord' },
      ],
    );

    return NextResponse.json({
      success: true,
      envelopeId: envelopeResponse.envelopeId,
      status: envelopeResponse.status,
    });
  } catch (error) {
    console.error('[Send for Signing] Error:', error);
    return NextResponse.json({ error: 'Failed to send for signing' }, { status: 500 });
  }
}
