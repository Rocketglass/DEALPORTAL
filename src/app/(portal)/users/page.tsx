'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  Check,
  X,
  Send,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortalUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  contact: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
  principal: {
    email: string;
    contact: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  broker: 'Broker',
  landlord: 'Landlord',
  landlord_agent: 'Landlord Agent',
  tenant: 'Tenant',
  tenant_agent: 'Tenant Agent',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  broker: 'bg-blue-50 text-blue-700',
  landlord: 'bg-amber-50 text-amber-700',
  landlord_agent: 'bg-amber-50 text-amber-600',
  tenant: 'bg-emerald-50 text-emerald-700',
  tenant_agent: 'bg-emerald-50 text-emerald-600',
};

const INVITABLE_ROLES = [
  { value: 'landlord', label: 'Landlord' },
  { value: 'landlord_agent', label: 'Landlord Agent' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'tenant_agent', label: 'Tenant Agent' },
  { value: 'broker', label: 'Broker' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function userName(user: PortalUser): string {
  if (user.contact) {
    const parts = [user.contact.first_name, user.contact.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    if (user.contact.company_name) return user.contact.company_name;
  }
  return user.email.split('@')[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('landlord');
  const [inviteLinkType, _setInviteLinkType] = useState<'property' | 'contact'>('property');
  const [inviteLinkId, setInviteLinkId] = useState('');
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);
  const [inviting, setInviting] = useState(false);

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, invitesRes, propsRes, contactsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/invitations'),
        fetch('/api/public/properties'),
        fetch('/api/users?type=contacts'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users ?? []);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations ?? []);
      }
      if (propsRes.ok) {
        const data = await propsRes.json();
        setProperties((data.properties ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        const allContacts = (data.contacts ?? data.users ?? []) as { id: string; contact_id?: string; email: string; role?: string; contact?: { first_name?: string; last_name?: string; company_name?: string } }[];
        setContacts(allContacts.map((c) => ({
          id: c.contact_id ?? c.id,
          name: c.contact?.company_name ?? [c.contact?.first_name, c.contact?.last_name].filter(Boolean).join(' ') ?? c.email,
          type: c.role ?? 'unknown',
        })));
      }
    } catch {
      toast({ title: 'Failed to load users', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          ...(inviteRole.includes('agent') && inviteLinkId ? { principalId: inviteLinkId } : {}),
          ...(inviteLinkType === 'property' && inviteLinkId ? { propertyId: inviteLinkId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to send invitation');
      }

      toast({ title: `Invitation sent to ${inviteEmail}`, variant: 'success' });
      setInviteEmail('');
      setShowInviteForm(false);
      fetchData();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to send invitation', variant: 'error' });
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRole(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update role');
      }

      toast({ title: 'Role updated', variant: 'success' });
      fetchData();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update role', variant: 'error' });
    } finally {
      setChangingRole(null);
    }
  }

  async function handleResendInvite(id: string) {
    try {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to resend');
      toast({ title: 'Invitation resent', variant: 'success' });
      fetchData();
    } catch {
      toast({ title: 'Failed to resend invitation', variant: 'error' });
    }
  }

  async function handleRevokeInvite(id: string) {
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      toast({ title: 'Invitation revoked', variant: 'success' });
      fetchData();
    } catch {
      toast({ title: 'Failed to revoke invitation', variant: 'error' });
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      userName(u).toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');
  const acceptedInvitations = invitations.filter((i) => i.status === 'accepted');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage portal access. Invite landlords, tenants, and agents.
          </p>
        </div>
        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          Invite User
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Send Invitation</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The user will receive an email with a link to create their account.
            </p>
            <form onSubmit={handleInvite} className="mt-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={inviteRole}
                    onChange={(e) => { setInviteRole(e.target.value); setInviteLinkId(''); }}
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  icon={inviting ? Loader2 : Send}
                  disabled={inviting}
                >
                  {inviting ? 'Sending...' : 'Send'}
                </Button>
              </div>
              {/* Link to property or principal — shown for landlord/tenant roles */}
              {inviteRole !== 'broker' && (
                <div className="flex gap-3 items-center">
                  {inviteRole.includes('agent') ? (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Agent for:</span>
                      <Select
                        value={inviteLinkId}
                        onChange={(e) => setInviteLinkId(e.target.value)}
                      >
                        <option value="">Select principal...</option>
                        {contacts
                          .filter((c) => inviteRole === 'landlord_agent' ? c.type === 'landlord' : c.type === 'tenant')
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </Select>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Link to property:</span>
                      <Select
                        value={inviteLinkId}
                        onChange={(e) => setInviteLinkId(e.target.value)}
                      >
                        <option value="">Optional — select property...</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="mt-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium">{userName(user)}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.principal && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Agent for {user.principal.contact
                              ? [user.principal.contact.first_name, user.principal.contact.last_name].filter(Boolean).join(' ')
                              : user.principal.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-50 text-gray-700'}`}>
                        <Shield className="h-3 w-3" />
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <X className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {user.last_login ? formatDate(user.last_login) : 'Never'}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={changingRole === user.id}
                        className="rounded border border-border bg-white px-2 py-1 text-xs outline-none focus:border-primary"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Pending Invitations</h2>
          <Card className="mt-3">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Sent</th>
                    <th className="px-5 py-3">Expires</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {inv.email}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[inv.role] ?? 'bg-gray-50 text-gray-700'}`}>
                          {ROLE_LABELS[inv.role] ?? inv.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {formatDate(inv.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(inv.expires_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleResendInvite(inv.id)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Resend invitation"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                            title="Revoke invitation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recently Accepted */}
      {acceptedInvitations.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Recently Accepted</h2>
          <Card className="mt-3">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {acceptedInvitations.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Accepted {inv.accepted_at ? formatDate(inv.accepted_at) : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[inv.role] ?? 'bg-gray-50 text-gray-700'}`}>
                      {ROLE_LABELS[inv.role] ?? inv.role}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
