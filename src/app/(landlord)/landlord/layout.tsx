// import { PortalSidebar } from '@/components/layout/portal-sidebar';
// import { Header } from '@/components/layout/header';
// import { LayoutDashboard, FileText, Building2, FileSignature, ScrollText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ padding: 16, background: '#eef' }}>Landlord Portal</div>
      <main>{children}</main>
    </div>
  );
}
