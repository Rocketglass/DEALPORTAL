import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, FileText, FileSignature, ScrollText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const tenantNavItems = [
  { href: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenant/applications', label: 'My Applications', icon: FileText },
  { href: '/tenant/lois', label: 'LOIs', icon: FileSignature },
  { href: '/tenant/leases', label: 'Leases', icon: ScrollText },
];

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex">
        <PortalSidebar navItems={tenantNavItems} portalName="Tenant Portal" />
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
