'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Building2 } from 'lucide-react';

interface RecentItem {
  id: string;
  name: string;
  address: string;
}

const STORAGE_KEY = 'rr_recently_viewed';

function readItems(): RecentItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return (JSON.parse(stored) as RecentItem[]).slice(0, 5);
  } catch {
    // localStorage unavailable
  }
  return [];
}

/**
 * Displays the last 5 recently viewed properties as clickable chips.
 * Reads from localStorage key `rr_recently_viewed`.
 * Only renders if there are items to show.
 */
export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readItems());
  }, []);

  // Don't render anything on the server or before hydration
  if (!mounted || items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground">Recently Viewed</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/properties/${item.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted hover:border-primary/20"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="min-w-0">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{item.address}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
