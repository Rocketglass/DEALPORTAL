import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { Header } from '@/components/layout/header';

export const dynamic = 'force-dynamic';

const tenantNavItems = [
  { href: '/tenant/dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' as const },
  { href: '/tenant/applications', label: 'My Applications', iconName: 'FileText' as const },
  { href: '/tenant/lois', label: 'LOIs', iconName: 'FileSignature' as const },
  { href: '/tenant/leases', label: 'Leases', iconName: 'ScrollText' as const },
  { href: '/tenant/invoices', label: 'Invoices', iconName: 'Receipt' as const },
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
