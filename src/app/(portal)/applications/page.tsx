// @ts-nocheck — Remove after running `supabase gen types typescript`
import Link from 'next/link';
import { FileText, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = {
  title: 'Applications | Rocket Realty',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
  info_requested: 'bg-purple-100 text-purple-700',
};

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      id, status, business_name, submitted_at, created_at,
      property:properties(name),
      unit:units(suite_number),
      contact:contacts(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Review and manage tenant applications.
          </p>
        </div>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-4">No applications yet.</p>
          <p className="text-sm">Applications will appear here when tenants submit them through the portal.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Business</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Applicant</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{app.business_name}</td>
                  <td className="px-4 py-3">
                    {app.contact?.first_name} {app.contact?.last_name}
                    <br />
                    <span className="text-xs text-muted-foreground">{app.contact?.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {app.property?.name}
                    {app.unit && <span className="text-muted-foreground"> — Suite {app.unit.suite_number}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(app.submitted_at || app.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${app.id}/review`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
