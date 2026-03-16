/**
 * POST /api/applications
 *
 * Public endpoint — no auth required. Tenants submit their application
 * from the apply form without an account.
 *
 * Steps:
 *  1. Upsert a contact record (type='prospect') by email
 *  2. Insert the application linked to that contact
 *  3. Return the new application ID so the client can upload documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeEmail, sanitizeHtml } from '@/lib/security/sanitize';
import { notifyApplicationReceived } from '@/lib/email/notifications';

// Service role client — bypasses RLS for unauthenticated public submissions
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // ----------------------------------------------------------------
    // Basic input validation
    // ----------------------------------------------------------------
    const {
      propertyId,
      // Step 1 — Business
      businessName,
      businessType,
      stateOfIncorporation,
      agreedUse,
      yearsInBusiness,
      numberOfEmployees,
      // Step 2 — Space requirements
      requestedSf,
      desiredTermMonths,
      desiredMoveIn,
      monthlyRentBudget,
      // Step 3 — Contact
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      // Step 3 — Guarantor (optional)
      guarantorName,
      guarantorEmail,
      guarantorPhone,
    } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const cleanEmail = sanitizeEmail(contactEmail ?? '');
    if (!cleanEmail) {
      return NextResponse.json({ error: 'A valid contact email is required' }, { status: 400 });
    }

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // ----------------------------------------------------------------
    // 1. Upsert contact — match on email so duplicate submissions
    //    for the same email don't create duplicate prospect records.
    // ----------------------------------------------------------------
    const contactInsert = {
      type: 'prospect' as const,
      first_name: sanitizeHtml(contactFirstName ?? '').trim() || null,
      last_name: sanitizeHtml(contactLastName ?? '').trim() || null,
      email: cleanEmail,
      phone: sanitizeHtml(contactPhone ?? '').trim() || null,
      company_name: sanitizeHtml(businessName).trim(),
      tags: [] as string[],
    };

    // Try to find an existing prospect contact with this email first
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', cleanEmail)
      .eq('type', 'prospect')
      .maybeSingle();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert(contactInsert)
        .select('id')
        .single();

      if (contactError || !newContact) {
        console.error('[applications POST] contact insert error:', contactError);
        return NextResponse.json(
          { error: 'Failed to create contact record' },
          { status: 500 },
        );
      }

      contactId = newContact.id;
    }

    // ----------------------------------------------------------------
    // 1b. Prevent duplicate applications for same contact + property
    // ----------------------------------------------------------------
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('contact_id', contactId)
      .eq('property_id', propertyId as string)
      .in('status', ['submitted', 'under_review', 'approved', 'info_requested'])
      .limit(1)
      .maybeSingle();

    if (existingApp) {
      return NextResponse.json(
        {
          error: 'You already have an active application for this property.',
          existingApplicationId: existingApp.id,
        },
        { status: 409 },
      );
    }

    // ----------------------------------------------------------------
    // 2. Insert application record
    // ----------------------------------------------------------------
    const applicationInsert = {
      property_id: propertyId as string,
      contact_id: contactId,
      status: 'submitted' as const,
      business_name: sanitizeHtml(businessName).trim(),
      business_type: sanitizeHtml(businessType ?? '').trim() || null,
      business_entity_state: stateOfIncorporation || null,
      agreed_use: sanitizeHtml(agreedUse ?? '').trim() || null,
      years_in_business: yearsInBusiness ? Number(yearsInBusiness) : null,
      number_of_employees: numberOfEmployees ? Number(numberOfEmployees) : null,
      requested_sf: requestedSf ? Number(requestedSf) : null,
      desired_term_months: desiredTermMonths ? Number(desiredTermMonths) : null,
      desired_move_in: desiredMoveIn || null,
      desired_rent_budget: monthlyRentBudget ? Number(monthlyRentBudget) : null,
      guarantor_name: sanitizeHtml(guarantorName ?? '').trim() || null,
      guarantor_email: guarantorEmail ? sanitizeEmail(guarantorEmail) || null : null,
      guarantor_phone: sanitizeHtml(guarantorPhone ?? '').trim() || null,
      submitted_at: new Date().toISOString(),
      portal_source: 'qr_portal',
      credit_check_status: 'not_run' as const,
    };

    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert(applicationInsert)
      .select('id')
      .single();

    if (appError || !application) {
      console.error('[applications POST] application insert error:', appError);
      return NextResponse.json(
        { error: 'Failed to create application record' },
        { status: 500 },
      );
    }

    // Fetch broker contact and property address in parallel for the notification.
    // Fall back gracefully — a lookup failure must never break the response.
    const [{ data: brokerContact }, { data: property }] = await Promise.all([
      supabase
        .from('contacts')
        .select('email, first_name, last_name, company_name')
        .eq('type', 'broker')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('properties')
        .select('address, city, state')
        .eq('id', propertyId as string)
        .maybeSingle(),
    ]);

    const brokerEmail = brokerContact?.email ?? 'broker@rocketglass.com';
    const brokerName =
      (brokerContact?.company_name
      ?? [brokerContact?.first_name, brokerContact?.last_name].filter(Boolean).join(' '))
      || 'Broker';

    const propertyAddress = property
      ? `${property.address}, ${property.city}, ${property.state}`
      : propertyId as string;

    void notifyApplicationReceived(
      {
        id: application.id,
        applicantName: [contactFirstName, contactLastName].filter(Boolean).join(' ') || cleanEmail,
        businessName: sanitizeHtml(businessName).trim(),
        propertyAddress,
      },
      brokerEmail,
      brokerName,
    );

    return NextResponse.json({ applicationId: application.id }, { status: 201 });
  } catch (error) {
    console.error('[applications POST] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
