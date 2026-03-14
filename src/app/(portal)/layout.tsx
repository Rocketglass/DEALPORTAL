import { Sidebar } from '@/components/layout/sidebar';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted">
        {children}
      </main>
    </div>
  );
}
