import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col">
        {/* Header with mobile nav toggle */}
        <div className="relative flex items-center bg-white">
          <div className="pl-4 lg:hidden">
            <MobileNav />
          </div>
          <div className="flex-1">
            <Header />
          </div>
        </div>

        <main className="flex-1 overflow-auto bg-muted">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
