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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="hidden lg:flex">
        <PortalSidebar navItems={tenantNavItems} portalName="Tenant Portal" />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="relative flex items-center bg-white">
          <div className="flex-1">
            <Header />
          </div>
        </div>

        <main id="main-content" className="flex-1 overflow-auto bg-background" tabIndex={-1}>
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
