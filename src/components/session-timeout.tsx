'use client';
import { useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let timeoutId: NodeJS.Timeout;

    function resetTimer() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login?reason=timeout');
      }, IDLE_TIMEOUT_MS);
    }

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [router]);

  return null;
}
