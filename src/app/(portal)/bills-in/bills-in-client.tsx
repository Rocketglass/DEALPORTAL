'use client';

import { useMemo, useRef, useState } from 'react';
import { Inbox, Plus, Search, Trash2, Eye, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export interface Bill {
  id: string;
  vendor_name: string;
  amount: number;
  pdf_url: string;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(s: string | null): string {
  if (!s) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(s));
}

interface BillsInClientProps {
  initialBills: Bill[];
}

export function BillsInClient({ initialBills }: BillsInClientProps) {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVendor, setPreviewVendor] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) =>
        b.vendor_name.toLowerCase().includes(q) ||
        String(b.amount).includes(q),
    );
  }, [bills, search]);

  const totals = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const b of bills) {
      if (b.paid) paid += Number(b.amount);
      else unpaid += Number(b.amount);
    }
    return { paid, unpaid, total: paid + unpaid };
  }, [bills]);

  function resetForm() {
    setVendorName('');
    setAmount('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: 'Please choose a PDF', variant: 'error' });
      return;
    }
    if (!vendorName.trim()) {
      toast({ title: 'Vendor name is required', variant: 'error' });
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: 'Amount must be greater than 0', variant: 'error' });
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({ title: 'File must be a PDF', variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('vendor_name', vendorName.trim());
      form.append('amount', String(amt));
      const res = await fetch('/api/bills-in', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Upload failed', description: data.error ?? 'Try again', variant: 'error' });
        return;
      }
      const { bill } = await res.json();
      setBills((prev) => [bill, ...prev]);
      toast({ title: 'Bill uploaded', variant: 'success' });
      resetForm();
      setShowForm(false);
    } catch {
      toast({ title: 'Network error', variant: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function togglePaid(bill: Bill) {
    setTogglingId(bill.id);
    try {
      const res = await fetch(`/api/bills-in/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: !bill.paid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Failed to update', description: data.error ?? 'Try again', variant: 'error' });
        return;
      }
      const { bill: updated } = await res.json();
      setBills((prev) => prev.map((b) => (b.id === bill.id ? updated : b)));
    } catch {
      toast({ title: 'Network error', variant: 'error' });
    } finally {
      setTogglingId(null);
    }
  }

  async function handlePreview(bill: Bill) {
    try {
      const res = await fetch(`/api/bills-in/${bill.id}/preview`);
      if (!res.ok) {
        toast({ title: 'Could not load preview', variant: 'error' });
        return;
      }
      const { url } = await res.json();
      setPreviewUrl(url);
      setPreviewVendor(bill.vendor_name);
    } catch {
      toast({ title: 'Network error', variant: 'error' });
    }
  }

  async function handleDelete(bill: Bill) {
    if (!confirm(`Delete the bill from ${bill.vendor_name}?`)) return;
    setDeletingId(bill.id);
    try {
      const res = await fetch(`/api/bills-in/${bill.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: data.error ?? 'Try again', variant: 'error' });
        return;
      }
      setBills((prev) => prev.filter((b) => b.id !== bill.id));
      toast({ title: 'Bill deleted', variant: 'success' });
    } catch {
      toast({ title: 'Network error', variant: 'error' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Bills In
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track invoices you receive from vendors and contractors. Upload, store, mark paid.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'New Bill'}
        </Button>
      </div>

      {/* Totals */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total bills</div>
            <div className="mt-1 text-xl font-semibold">{formatCurrency(totals.total)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{bills.length} {bills.length === 1 ? 'bill' : 'bills'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-amber-700">Unpaid</div>
            <div className="mt-1 text-xl font-semibold text-amber-700">{formatCurrency(totals.unpaid)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{bills.filter((b) => !b.paid).length} unpaid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-emerald-700">Paid</div>
            <div className="mt-1 text-xl font-semibold text-emerald-700">{formatCurrency(totals.paid)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{bills.filter((b) => b.paid).length} paid</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload form */}
      {showForm && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold mb-4">Upload a new bill</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Vendor name"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. San Diego Gas & Electric"
                />
                <Input
                  label="Amount ($)"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">PDF<span className="text-destructive ml-0.5">*</span></label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  required
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-light"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={uploading} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload bill'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="mt-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by vendor or amount…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-3"><Inbox className="h-6 w-6 text-muted-foreground" /></div>
              <p className="mt-3 text-sm font-medium">{bills.length === 0 ? 'No bills yet' : 'No bills match your search'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {bills.length === 0 ? 'Click "New Bill" to upload your first invoice.' : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{bill.vendor_name}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(bill.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(bill.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => togglePaid(bill)}
                        disabled={togglingId === bill.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          bill.paid
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {togglingId === bill.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : bill.paid ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {bill.paid ? `Paid ${bill.paid_at ? formatDate(bill.paid_at) : ''}`.trim() : 'Unpaid'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => handlePreview(bill)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bill)}
                          disabled={deletingId === bill.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          title="Delete bill"
                        >
                          {deletingId === bill.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">{previewVendor}</h2>
              <button onClick={() => setPreviewUrl(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[80vh] bg-muted">
              <iframe src={previewUrl} className="h-full w-full" title="Bill preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
