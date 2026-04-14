'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Scale, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

// ============================================================
// Types
// ============================================================

interface Collaborator {
  id: string;
  deal_type: string;
  deal_id: string;
  role: 'landlord_lawyer' | 'tenant_lawyer';
  name: string;
  email: string;
  invited_at: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
}

interface CollaboratorsPanelProps {
  dealType: 'loi' | 'lease';
  dealId: string;
}

// ============================================================
// Helpers
// ============================================================

const ROLE_LABELS: Record<string, string> = {
  landlord_lawyer: "Landlord's Attorney",
  tenant_lawyer: "Tenant's Attorney",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      <Scale className="h-3 w-3" />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function StatusDot({ revoked }: { revoked: boolean }) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        revoked ? 'bg-muted-foreground' : 'bg-emerald-500',
      )}
      aria-label={revoked ? 'Revoked' : 'Active'}
    />
  );
}

// ============================================================
// Component
// ============================================================

export function CollaboratorsPanel({ dealType, dealId }: CollaboratorsPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'landlord_lawyer' | 'tenant_lawyer'>('tenant_lawyer');

  const apiBase = `/api/deals/${dealType}/${dealId}/collaborators`;

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (res.ok) {
        const json = await res.json();
        setCollaborators(json.collaborators ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Failed to invite');
        return;
      }

      // Reset form and refresh
      setName('');
      setEmail('');
      setShowForm(false);
      await fetchCollaborators();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(collaboratorId: string) {
    setRevoking(collaboratorId);
    try {
      const res = await fetch(`${apiBase}/${collaboratorId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchCollaborators();
      }
    } catch {
      // silent
    } finally {
      setRevoking(null);
    }
  }

  const activeCount = collaborators.filter((c) => !c.revoked_at).length;

  return (
    <Card>
      <CardHeader icon={Users}>
        <div className="flex items-center justify-between w-full">
          <CardTitle>Collaborators</CardTitle>
          {!showForm && (
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => setShowForm(true)}
              disabled={activeCount >= 2}
            >
              Invite Lawyer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Invite form */}
        {showForm && (
          <form onSubmit={handleInvite} className="mb-4 rounded-lg border border-border p-4 space-y-3">
            <Input
              label="Name"
              required
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              required
              type="email"
              placeholder="jane@lawfirm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="tenant_lawyer">Tenant&apos;s Attorney</option>
              <option value="landlord_lawyer">Landlord&apos;s Attorney</option>
            </Select>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Invite'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setError(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No lawyers have been invited to this {dealType === 'loi' ? 'LOI' : 'lease'} yet.
          </p>
        ) : (
          <div className="space-y-3">
            {collaborators.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-lg border border-border/50 p-3',
                  c.revoked_at && 'opacity-50',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusDot revoked={!!c.revoked_at} />
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <RoleBadge role={c.role} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {c.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.revoked_at
                      ? `Revoked ${formatDate(c.revoked_at)}`
                      : `Invited ${formatDate(c.invited_at)}`}
                    {c.last_accessed_at && !c.revoked_at && (
                      <> &middot; Last viewed {formatDate(c.last_accessed_at)}</>
                    )}
                  </p>
                </div>
                {!c.revoked_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => handleRevoke(c.id)}
                    loading={revoking === c.id}
                    disabled={revoking === c.id}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label={`Revoke access for ${c.name}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
