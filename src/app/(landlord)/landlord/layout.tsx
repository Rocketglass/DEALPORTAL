import { Header } from '@/components/layout/header';

export const dynamic = 'force-dynamic';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
