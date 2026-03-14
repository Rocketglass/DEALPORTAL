import Link from 'next/link';
import { Building2, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/browse"
              className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              Properties
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-light"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="animate-fade-in-up max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Commercial Leasing,{' '}
          <span className="text-primary">Simplified</span>
        </h1>
        <p className="animate-fade-in-up-delay-1 mt-4 max-w-lg text-lg text-muted-foreground">
          Browse available spaces, submit applications, and manage your lease —
          all in one place.
        </p>
        <div className="animate-fade-in-up-delay-2 mt-8 flex gap-4">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-light"
          >
            View Properties
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Rocket Realty. All rights reserved.
      </footer>
    </div>
  );
}
