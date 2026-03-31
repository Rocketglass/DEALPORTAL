'use client';

import { useState } from 'react';
import { Send, Copy, Check, Loader2, Printer, ScrollText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface LoiActionButtonsProps {
  loiId: string;
  status: string;
}

export function LoiActionButtons({ loiId, status }: LoiActionButtonsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  const isDraft = status === 'draft';
  const isAgreed = status === 'agreed';

  async function handleCopyLink() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = `${baseUrl}/loi/${loiId}/review`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSend() {
    setSending(true);
    setSendResult(null);

    try {
      const endpoint = isDraft
        ? `/api/lois/${loiId}/send`
        : `/api/lois/${loiId}/resend`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to send');
      }
      setSendResult('success');
      if (isDraft) {
        // Refresh the page to reflect the new 'sent' status
        setTimeout(() => router.refresh(), 1000);
      }
      setTimeout(() => setSendResult(null), 3000);
    } catch (err) {
      console.error('Send failed:', err);
      setSendResult('error');
      setTimeout(() => setSendResult(null), 3000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        icon={Printer}
        onClick={() => window.open(`/lois/${loiId}/print`, '_blank')}
      >
        Print / PDF
      </Button>
      {!isDraft && (
        <Button
          variant="secondary"
          icon={copied ? Check : Copy}
          onClick={handleCopyLink}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      )}
      {isAgreed ? (
        <Button
          variant="primary"
          icon={ScrollText}
          onClick={() => router.push(`/leases/new?loi=${loiId}`)}
        >
          Convert to Lease
        </Button>
      ) : (
        <Button
          variant="primary"
          icon={sending ? Loader2 : Send}
          onClick={handleSend}
          disabled={sending}
        >
          {sendResult === 'success'
            ? 'Sent!'
            : sendResult === 'error'
              ? 'Failed'
              : isDraft
                ? 'Send to Landlord'
                : 'Resend'}
        </Button>
      )}
    </div>
  );
}
