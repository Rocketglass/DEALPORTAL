import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { Header } from '@/components/layout/header';

export const dynamic = 'force-dynamic';

const landlordNavItems = [
  { href: '/landlord/dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' as const },
  { href: '/landlord/applications', label: 'Applications', iconName: 'FileText' as const },
  { href: '/landlord/lois', label: 'LOIs', iconName: 'FileSignature' as const },
  { href: '/landlord/leases', label: 'Leases', iconName: 'ScrollText' as const },
  { href: '/landlord/properties', label: 'Properties', iconName: 'Building2' as const },
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
