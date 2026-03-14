import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Rocket Realty Portal',
    template: '%s | Rocket Realty',
  },
  description: 'Commercial real estate deal flow portal for Rocket Realty',
  openGraph: {
    title: 'Rocket Realty Portal',
    description: 'Commercial real estate deal flow portal for Rocket Realty',
    type: 'website',
  },
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
