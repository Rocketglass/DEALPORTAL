import Link from 'next/link';
import { ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <PublicHeader />

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="animate-fade-in-up text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[44px] lg:leading-tight">
            Commercial Leasing,{' '}
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="animate-fade-in-up-delay-1 mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Browse available spaces, submit applications, and manage your entire lease
            lifecycle — all in one place.
          </p>
          <div className="animate-fade-in-up-delay-2 mt-8 flex justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-150 hover:bg-primary-light hover:shadow-md hover:shadow-primary/20"
            >
              View Properties
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-foreground transition-all duration-150 hover:bg-muted"
            >
              Broker Login
            </Link>
          </div>
        </div>

        {/* Value props */}
        <div className="animate-fade-in-up-delay-3 mx-auto mt-20 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: 'Fast Applications',
              desc: 'Scan a QR code and apply in minutes from your phone.',
            },
            {
              icon: Shield,
              title: 'Secure Documents',
              desc: 'Bank-grade encryption for leases and financial docs.',
            },
            {
              icon: BarChart3,
              title: 'Deal Analytics',
              desc: 'Real-time pipeline tracking from LOI to lease execution.',
            },
          ].map((item) => (
            <div key={item.title} className="text-center sm:text-left">
              <item.icon className="mx-auto h-5 w-5 text-primary sm:mx-0" />
              <h3 className="mt-3 text-[13px] font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 text-center text-[12px] text-muted-foreground">
        &copy; {new Date().getFullYear()} Rocket Realty. All rights reserved.
      </footer>
    </div>
  );
}
