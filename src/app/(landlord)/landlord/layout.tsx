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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="hidden lg:flex">
        <PortalSidebar navItems={landlordNavItems} portalName="Landlord Portal" />
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
