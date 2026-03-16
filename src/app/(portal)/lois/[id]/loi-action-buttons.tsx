'use client';

import { useState } from 'react';
import { Send, Copy, Check, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoiActionButtonsProps {
  loiId: string;
}

export function LoiActionButtons({ loiId }: LoiActionButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<'success' | 'error' | null>(null);

  async function handleCopyLink() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = `${baseUrl}/loi/${loiId}/review`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

  async function handleResend() {
    setResending(true);
    setResendResult(null);

    try {
      const res = await fetch(`/api/lois/${loiId}/resend`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to resend');
      }
      setResendResult('success');
      setTimeout(() => setResendResult(null), 3000);
    } catch (err) {
      console.error('Resend failed:', err);
      setResendResult('error');
      setTimeout(() => setResendResult(null), 3000);
    } finally {
      setResending(false);
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
      <Button
        variant="secondary"
        icon={copied ? Check : Copy}
        onClick={handleCopyLink}
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>
      <Button
        variant="primary"
        icon={resending ? Loader2 : Send}
        onClick={handleResend}
        disabled={resending}
      >
        {resendResult === 'success'
          ? 'Sent!'
          : resendResult === 'error'
            ? 'Failed'
            : 'Resend'}
      </Button>
    </div>
  );
}
