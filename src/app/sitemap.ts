import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * robots.txt advertises a sitemap at /sitemap.xml. This serves it dynamically
 * so newly-listed properties show up to crawlers without redeploying.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://rocketrealty.properties';

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/browse`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/apply`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/register`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Active, listed properties — visible on /browse and indexable.
  let propertyUrls: MetadataRoute.Sitemap = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { data } = await supabase
      .from('properties')
      .select('id, updated_at')
      .eq('is_active', true);
    propertyUrls = (data ?? []).map((p: { id: string; updated_at: string | null }) => ({
      url: `${base}/browse/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // If Supabase is unreachable, fall back to static-only — never 500 the sitemap.
  }

  return [...staticUrls, ...propertyUrls];
}
