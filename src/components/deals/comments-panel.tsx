'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Scale, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ============================================================
// Types
// ============================================================

interface Comment {
  id: string;
  deal_type: string;
  deal_id: string;
  section_id: string | null;
  author_name: string;
  author_email: string;
  author_role: string;
  comment: string;
  created_at: string;
}

interface CommentsPanelProps {
  dealType: 'loi' | 'lease';
  dealId: string;
  /** Optional access_token for lawyer auth (appended to API calls) */
  accessToken?: string;
}

// ============================================================
// Helpers
// ============================================================

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  broker: { bg: 'bg-primary-subtle', text: 'text-primary', label: 'Broker' },
  admin: { bg: 'bg-primary-subtle', text: 'text-primary', label: 'Admin' },
  landlord: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Landlord' },
  tenant: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Tenant' },
  landlord_lawyer: { bg: 'bg-violet-50', text: 'text-violet-700', label: "Landlord's Attorney" },
  tenant_lawyer: { bg: 'bg-violet-50', text: 'text-violet-700', label: "Tenant's Attorney" },
};

const DEFAULT_ROLE_STYLE = { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Unknown' };

function AuthorBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || DEFAULT_ROLE_STYLE;
  const isLawyer = role.includes('lawyer');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        style.bg,
        style.text,
      )}
    >
      {isLawyer && <Scale className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// ============================================================
// Component
// ============================================================

export function CommentsPanel({ dealType, dealId, accessToken }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const tokenParam = accessToken ? `?token=${accessToken}` : '';
  const apiBase = `/api/deals/${dealType}/${dealId}/comments${tokenParam}`;

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (res.ok) {
        const json = await res.json();
        setComments(json.comments ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Scroll to bottom when comments change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (res.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader icon={MessageSquare}>
        <CardTitle>
          Comments
          {comments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Comments list */}
        <div className="max-h-96 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No comments yet. Be the first to comment.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="group">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.author_name}</span>
                    <AuthorBadge role={c.author_role} />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  {c.section_id && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Section comment
                    </p>
                  )}
                  <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {c.comment}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Compose */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border px-5 py-3 flex items-end gap-2"
        >
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            icon={Send}
            disabled={!newComment.trim() || submitting}
            loading={submitting}
            aria-label="Send comment"
          />
        </form>
      </CardContent>
    </Card>
  );
}
