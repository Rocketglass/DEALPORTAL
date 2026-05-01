'use client';

import { useRef, useState } from 'react';
import { Send, Copy, Check, Loader2, Eye, ScrollText, FileSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface LoiActionButtonsProps {
  loiId: string;
  status: string;
}

export function LoiActionButtons({ loiId, status }: LoiActionButtonsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);
  const [uploadingOffline, setUploadingOffline] = useState(false);
  const offlineInputRef = useRef<HTMLInputElement>(null);

  const isDraft = status === 'draft';
  const isAgreed = status === 'agreed';
  // Show "Mark Agreed (Offline)" while the LOI is in flight — broker may
  // have taken it to the landlord on paper at any of these states.
  const canMarkOffline = ['draft', 'sent', 'in_negotiation'].includes(status);

  async function handleOfflineUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingOffline(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/lois/${loiId}/mark-agreed-offline`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Upload failed', description: data.error ?? 'Please try again', variant: 'error' });
        return;
      }
      toast({ title: 'LOI marked as agreed', description: 'Ready to convert to a lease.', variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: 'Network error', variant: 'error' });
    } finally {
      setUploadingOffline(false);
    }
  }

  async function handleCopyLink() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    // Generate a signed review token so the link is secure
    let tokenParam = '';
    try {
      const res = await fetch(`/api/lois/${loiId}/review-token`, { method: 'POST' });
      if (res.ok) {
        const { token } = await res.json();
        tokenParam = `?token=${encodeURIComponent(token)}`;
      }
    } catch {
      // If token generation fails, still copy the URL (it will prompt re-auth on open)
    }

    const url = `${baseUrl}/loi/${loiId}/review${tokenParam}`;

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
        icon={Eye}
        onClick={() => window.open(`/lois/${loiId}/print`, '_blank')}
      >
        Preview
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
      {canMarkOffline && (
        <>
          <input
            ref={offlineInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleOfflineUpload}
          />
          <Button
            variant="secondary"
            icon={uploadingOffline ? Loader2 : FileSignature}
            onClick={() => offlineInputRef.current?.click()}
            disabled={uploadingOffline}
            title="Upload a paper-signed LOI and mark it agreed"
          >
            {uploadingOffline ? 'Uploading…' : 'Mark Agreed (Offline)'}
          </Button>
        </>
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
                ? 'Send for Review'
                : 'Resend'}
        </Button>
      )}
    </div>
  );
}
