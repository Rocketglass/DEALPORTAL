'use client';

import { useState } from 'react';
import {
  User,
  Percent,
  Bell,
  Palette,
  Plug,
  Save,
  Upload,
  Check,
} from 'lucide-react';

// ─── Profile Section ─────────────────────────────────────────
function ProfileSection() {
  const [profile, setProfile] = useState({
    firstName: 'Neil',
    lastName: 'Bajaj',
    email: 'neil@rocketrealty.com',
    phone: '(619) 555-0100',
    company: 'Rocket Realty',
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
          <User className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <h2 className="text-base font-semibold">Profile</h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">First Name</label>
          <input
            type="text"
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Last Name</label>
          <input
            type="text"
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Email</label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Phone</label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Company</label>
          <input
            type="text"
            value={profile.company}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Commission Settings ─────────────────────────────────────
function CommissionSection() {
  const [rate, setRate] = useState('5');
  const [terms, setTerms] = useState('net_30');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--success)]/10">
          <Percent className="h-4 w-4 text-[var(--success)]" />
        </div>
        <h2 className="text-base font-semibold">Commission Settings</h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">
            Default Commission Rate (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">
            Default Payment Terms
          </label>
          <select
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="due_on_receipt">Due on Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_45">Net 45</option>
            <option value="net_60">Net 60</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Email Notifications ─────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    newApplication: true,
    loiCountered: true,
    leaseExecuted: true,
    invoicePaid: true,
  });

  const items = [
    { key: 'newApplication' as const, label: 'New application received', desc: 'Get notified when a tenant submits a new application.' },
    { key: 'loiCountered' as const, label: 'LOI countered by landlord', desc: 'Get notified when a landlord responds to an LOI.' },
    { key: 'leaseExecuted' as const, label: 'Lease executed', desc: 'Get notified when a lease is fully signed.' },
    { key: 'invoicePaid' as const, label: 'Invoice paid', desc: 'Get notified when a commission invoice is paid.' },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning)]/10">
          <Bell className="h-4 w-4 text-[var(--warning)]" />
        </div>
        <h2 className="text-base font-semibold">Email Notifications</h2>
      </div>

      <div className="mt-6 divide-y divide-[var(--border)]">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.desc}</p>
            </div>
            <Toggle
              checked={prefs[item.key]}
              onChange={(v) => setPrefs({ ...prefs, [item.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Portal Branding ─────────────────────────────────────────
function BrandingSection() {
  const [companyName, setCompanyName] = useState('Rocket Realty');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
          <Palette className="h-4 w-4 text-purple-600" />
        </div>
        <h2 className="text-base font-semibold">Portal Branding</h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">
            Company Name (displayed in portal)
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">
            Primary Color
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-10 w-10 rounded-lg border border-[var(--border)]"
              style={{ backgroundColor: primaryColor }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1e40af"
              className="h-10 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--muted-foreground)]">Logo</label>
          <div className="mt-1 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)]">
            <div className="text-center">
              <Upload className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Drag and drop or click to upload
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">PNG, SVG up to 2MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Integrations ────────────────────────────────────────────
function IntegrationsSection() {
  const integrations = [
    {
      name: 'Supabase',
      description: 'Database, authentication, and file storage',
      connected: true,
    },
    {
      name: 'DocuSign',
      description: 'Electronic lease signing and document management',
      connected: false,
    },
    {
      name: 'Resend',
      description: 'Transactional email delivery',
      connected: false,
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
          <Plug className="h-4 w-4 text-cyan-600" />
        </div>
        <h2 className="text-base font-semibold">Integrations</h2>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  integration.connected ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                }`}
              />
              <span className="text-sm font-semibold">{integration.name}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {integration.description}
            </p>
            <p className={`mt-3 text-xs font-medium ${
              integration.connected ? 'text-[var(--success)]' : 'text-[var(--muted-foreground)]'
            }`}>
              {integration.connected ? 'Connected' : 'Not configured'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Manage your account, preferences, and integrations.
        </p>

        <div className="mt-8 space-y-6">
          <ProfileSection />
          <CommissionSection />
          <NotificationsSection />
          <BrandingSection />
          <IntegrationsSection />
        </div>
      </div>
    </div>
  );
}
