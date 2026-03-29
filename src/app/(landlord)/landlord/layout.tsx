export const dynamic = 'force-dynamic';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ padding: '16px', background: '#f0f0f0' }}>Landlord Portal (minimal layout)</div>
      {children}
    </div>
  );
}
