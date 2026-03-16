import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface PublicHeaderProps {
  /** Optional right-side link (e.g. "View Property") */
  rightLink?: { href: string; label: string };
  /** Hide the nav links (Properties, Sign In). Useful for focused flows like apply/LOI review. */
  minimal?: boolean;
}

export function PublicHeader({ rightLink, minimal }: PublicHeaderProps) {
  return (
    <header className="border-b border-border bg-[var(--background-raised)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Rocket Realty</span>
        </Link>
        <div className="flex items-center gap-5">
          {rightLink && (
            <Link
              href={rightLink.href}
              className="text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {rightLink.label}
            </Link>
          )}
          {!minimal && (
            <>
              <Link
                href="/browse"
                className="text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                Properties
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-primary-light"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
