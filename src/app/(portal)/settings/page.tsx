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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

// --- Profile Section ---
function ProfileSection() {
  const [profile, setProfile] = useState({
    firstName: 'Neil',
    lastName: 'Bajaj',
    email: 'neil@rocketrealty.com',
    phone: '(619) 555-0100',
    company: 'Rocket Realty',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!profile.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaved(true);
    toast({ title: 'Profile saved', description: 'Your profile has been updated.', variant: 'success' });
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Profile</h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
          />
          <Input
            label="Last Name"
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={profile.email}
            onChange={(e) => { setProfile({ ...profile, email: e.target.value }); clearError('email'); }}
            error={errors.email}
          />
          <Input
            label="Phone"
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <Input
            label="Company"
            className="sm:col-span-2"
            value={profile.company}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Commission Settings ---
function CommissionSection() {
  const [rate, setRate] = useState('5');
  const [terms, setTerms] = useState('net_30');
  const [saved, setSaved] = useState(false);
  const [rateError, setRateError] = useState('');
  const { toast } = useToast();

  function handleSave() {
    const num = parseFloat(rate);
    if (isNaN(num) || num <= 0) {
      setRateError('Commission rate must be a positive number');
      return;
    }
    setRateError('');
    setSaved(true);
    toast({ title: 'Commission settings saved', description: `Default rate set to ${rate}%.`, variant: 'success' });
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
            <Percent className="h-4 w-4 text-success" />
          </div>
          <h2 className="text-base font-semibold">Commission Settings</h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="Default Commission Rate (%)"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={rate}
            onChange={(e) => { setRate(e.target.value); setRateError(''); }}
            error={rateError}
          />
          <Select
            label="Default Payment Terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          >
            <option value="due_on_receipt">Due on Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_45">Net 45</option>
            <option value="net_60">Net 60</option>
          </Select>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Email Notifications ---
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-border'
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
            <Bell className="h-4 w-4 text-warning" />
          </div>
          <h2 className="text-base font-semibold">Email Notifications</h2>
        </div>

        <div className="mt-6 divide-y divide-border">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Toggle
                checked={prefs[item.key]}
                onChange={(v) => setPrefs({ ...prefs, [item.key]: v })}
                label={item.label}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Portal Branding ---
function BrandingSection() {
  const [companyName, setCompanyName] = useState('Rocket Realty');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
            <Palette className="h-4 w-4 text-purple-600" />
          </div>
          <h2 className="text-base font-semibold">Portal Branding</h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="Company Name (displayed in portal)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="h-10 w-10 rounded-lg border border-border"
                style={{ backgroundColor: primaryColor }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1e40af"
                className="h-10 flex-1 rounded-lg border border-border bg-white px-3 font-mono text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Logo</label>
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop or click to upload
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, SVG up to 2MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Integrations ---
function IntegrationsSection() {
  const integrations = [
    { name: 'Supabase', description: 'Database, authentication, and file storage', connected: true },
    { name: 'DocuSign', description: 'Electronic lease signing and document management', connected: false },
    { name: 'Resend', description: 'Transactional email delivery', connected: false },
  ];

  return (
    <Card>
      <CardContent className="p-6">
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
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    integration.connected ? 'bg-success' : 'bg-border'
                  }`}
                />
                <span className="text-sm font-semibold">{integration.name}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {integration.description}
              </p>
              <p className={`mt-3 text-xs font-medium ${
                integration.connected ? 'text-success' : 'text-muted-foreground'
              }`}>
                {integration.connected ? 'Connected' : 'Not configured'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
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
