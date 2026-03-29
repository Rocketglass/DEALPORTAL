import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, FileText, Building2, FileSignature, ScrollText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const landlordNavItems = [
  { href: '/landlord/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/landlord/applications', label: 'Applications', icon: FileText },
  { href: '/landlord/lois', label: 'LOIs', icon: FileSignature },
  { href: '/landlord/leases', label: 'Leases', icon: ScrollText },
  { href: '/landlord/properties', label: 'Properties', icon: Building2 },
];

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex">
        <PortalSidebar navItems={landlordNavItems} portalName="Landlord Portal" />
      </div>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
