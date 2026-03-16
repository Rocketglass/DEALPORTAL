import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyApplicationReminder, notifyApplicationReminderUrgent } from '@/lib/email/notifications';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret — fail closed if not configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find draft applications older than 24h but less than 7 days
  const { data: draftApps, error: queryError } = await supabase
    .from('applications')
    .select(`
      id,
      property_id,
      contact_id,
      unit_id,
      created_at,
      contact:contacts!applications_contact_id_fkey(first_name, email),
      property:properties!applications_property_id_fkey(address, city, state),
      unit:units!applications_unit_id_fkey(suite_number)
    `)
    .eq('status', 'draft')
    .lt('created_at', twentyFourHoursAgo.toISOString())
    .gt('created_at', sevenDaysAgo.toISOString());

  if (queryError) {
    console.error('[cron/application-reminders] Query error:', queryError);
    return NextResponse.json({ error: 'Failed to query applications' }, { status: 500 });
  }

  if (!draftApps || draftApps.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0 });
  }

  // Get already-sent reminders to avoid duplicates
  const appIds = draftApps.map((a) => a.id);
  const { data: existingReminders } = await supabase
    .from('application_reminders')
    .select('application_id, reminder_type')
    .in('application_id', appIds)
    .in('reminder_type', ['incomplete_24h', 'incomplete_72h']);

  const alreadySentSet = new Set(
    (existingReminders ?? []).map((r) => `${r.application_id}:${r.reminder_type}`),
  );

  let sent = 0;
  let skipped = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rocket-realty-portal.vercel.app';

  for (const app of draftApps) {
    const contact = app.contact as unknown as { first_name: string | null; email: string | null } | null;
    const property = app.property as unknown as { address: string; city: string; state: string } | null;
    const unit = app.unit as unknown as { suite_number: string | null } | null;

    if (!contact?.email) {
      skipped++;
      continue;
    }

    const propertyAddress = property
      ? `${property.address}, ${property.city}, ${property.state}`
      : 'the property';
    const suiteNumber: string | undefined = unit?.suite_number ?? undefined;
    const resumeUrl = `${appUrl}/apply/${app.property_id}`;
    const createdAt = new Date(app.created_at);

    // --- 72-hour reminder ---
    if (createdAt <= seventyTwoHoursAgo && !alreadySentSet.has(`${app.id}:incomplete_72h`)) {
      try {
        await notifyApplicationReminderUrgent(
          {
            applicantFirstName: contact.first_name || 'there',
            propertyAddress,
            suiteNumber,
            resumeUrl,
          },
          contact.email,
        );

        await supabase.from('application_reminders').insert({
          application_id: app.id,
          reminder_type: 'incomplete_72h',
          email_to: contact.email,
        });

        sent++;
      } catch (err) {
        console.error(`[cron] Failed to send 72h reminder for app ${app.id}:`, err);
        skipped++;
      }
    }

    // --- 24-hour reminder ---
    if (!alreadySentSet.has(`${app.id}:incomplete_24h`)) {
      try {
        await notifyApplicationReminder(
          {
            applicantFirstName: contact.first_name || 'there',
            propertyAddress,
            suiteNumber,
            resumeUrl,
          },
          contact.email,
        );

        await supabase.from('application_reminders').insert({
          application_id: app.id,
          reminder_type: 'incomplete_24h',
          email_to: contact.email,
        });

        sent++;
      } catch (err) {
        console.error(`[cron] Failed to send 24h reminder for app ${app.id}:`, err);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log(
    `[cron/application-reminders] processed=${draftApps.length} sent=${sent} skipped=${skipped}`,
  );
  return NextResponse.json({ processed: draftApps.length, sent, skipped });
}
