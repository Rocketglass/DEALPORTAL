'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { ComparableTransaction } from '@/types/database';

type FormState = {
  address: string;
  city: string;
  state: string;
  property_type: string;
  transaction_type: string;
  transaction_date: string;
  tenant_name: string;
  sf: string;
  rent_per_sqft: string;
  monthly_rent: string;
  lease_term_months: string;
  sale_price: string;
  price_per_sqft: string;
  cap_rate: string;
  notes: string;
  source: string;
};

const typeOptions = [
  { value: 'lease', label: 'Lease' },
  { value: 'sale', label: 'Sale' },
];

const sourceOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'costar', label: 'CoStar' },
  { value: 'manual', label: 'Manual' },
];

const emptyForm: FormState = {
  address: '',
  city: '',
  state: 'CA',
  property_type: '',
  transaction_type: 'lease',
  transaction_date: '',
  tenant_name: '',
  sf: '',
  rent_per_sqft: '',
  monthly_rent: '',
  lease_term_months: '',
  sale_price: '',
  price_per_sqft: '',
  cap_rate: '',
  notes: '',
  source: 'manual',
};

function compToForm(comp: ComparableTransaction): FormState {
  return {
    address: comp.address ?? '',
    city: comp.city ?? '',
    state: comp.state ?? 'CA',
    property_type: comp.property_type ?? '',
    transaction_type: comp.transaction_type ?? 'lease',
    transaction_date: comp.transaction_date ?? '',
    tenant_name: comp.tenant_name ?? '',
    sf: comp.sf != null ? String(comp.sf) : '',
    rent_per_sqft: comp.rent_per_sqft != null ? String(comp.rent_per_sqft) : '',
    monthly_rent: comp.monthly_rent != null ? String(comp.monthly_rent) : '',
    lease_term_months: comp.lease_term_months != null ? String(comp.lease_term_months) : '',
    sale_price: comp.sale_price != null ? String(comp.sale_price) : '',
    price_per_sqft: comp.price_per_sqft != null ? String(comp.price_per_sqft) : '',
    cap_rate: comp.cap_rate != null ? String(comp.cap_rate) : '',
    notes: comp.notes ?? '',
    source: comp.source ?? 'manual',
  };
}

interface Props {
  comps: ComparableTransaction[];
  error: string | null;
}

export function CompsClient({ comps, error }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  function resetForm() {
    setForm({ ...emptyForm });
    setSaveError(null);
    setEditingId(null);
  }

  function handleEdit(comp: ComparableTransaction) {
    setForm(compToForm(comp));
    setEditingId(comp.id);
    setShowForm(true);
    setSaveError(null);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/comps/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Delete failed (${res.status})`);
      }

      setDeletingId(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const url = editingId ? `/api/comps/${editingId}` : '/api/comps';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Save failed (${res.status})`);
      }

      resetForm();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'address',
      label: 'Address',
      sortable: true,
      render: (row: ComparableTransaction) => (
        <div>
          <span className="font-medium">{row.address}</span>
          <br />
          <span className="text-xs text-muted-foreground">
            {row.city}, {row.state}
          </span>
        </div>
      ),
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (row: ComparableTransaction) => (
        <Badge status={row.transaction_type === 'lease' ? 'lease' : 'sale'} />
      ),
    },
    {
      key: 'transaction_date',
      label: 'Date',
      sortable: true,
      render: (row: ComparableTransaction) => (
        <span className="text-muted-foreground">{formatDate(row.transaction_date)}</span>
      ),
    },
    {
      key: 'tenant_name',
      label: 'Tenant',
      render: (row: ComparableTransaction) => (
        <span>{row.tenant_name || '\u2014'}</span>
      ),
    },
    {
      key: 'sf',
      label: 'SF',
      sortable: true,
      render: (row: ComparableTransaction) => (
        <span>{row.sf ? new Intl.NumberFormat('en-US').format(row.sf) : '\u2014'}</span>
      ),
    },
    {
      key: 'rent_per_sqft',
      label: 'Rent/SF',
      sortable: true,
      render: (row: ComparableTransaction) => (
        <span>{row.rent_per_sqft ? `$${Number(row.rent_per_sqft).toFixed(2)}` : '\u2014'}</span>
      ),
    },
    {
      key: 'lease_term_months',
      label: 'Term',
      render: (row: ComparableTransaction) => (
        <span className="text-muted-foreground">
          {row.lease_term_months ? `${row.lease_term_months} mo` : '\u2014'}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (row: ComparableTransaction) => (
        <span className="text-xs text-muted-foreground capitalize">{row.source || '\u2014'}</span>
      ),
    },
    {
      key: '_actions',
      label: '',
      render: (row: ComparableTransaction) => (
        <div className="flex items-center justify-end gap-1">
          {deletingId === row.id ? (
            <div className="flex items-center gap-2">
              {deleteError && (
                <span className="text-xs text-red-600">{deleteError}</span>
              )}
              <span className="text-xs text-muted-foreground">Delete?</span>
              <button
                onClick={() => { setDeletingId(null); setDeleteError(null); }}
                disabled={deleting}
                className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(row.id)}
                disabled={deleting}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleEdit(row)}
                className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Edit comp"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setDeletingId(row.id); setDeleteError(null); }}
                className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete comp"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold">Market Comps</h1>
          <p className="mt-1 text-muted-foreground">
            Reference comparable lease and sale transactions.
          </p>
        </div>
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load comps. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market Comps</h1>
          <p className="mt-1 text-muted-foreground">
            Reference comparable lease and sale transactions when drafting LOIs.
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add Comp
        </Button>
      </div>

      {/* Add Comp Form */}
      {showForm && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Comparable Transaction' : 'New Comparable Transaction'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="Address"
                  required
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
                <Input
                  label="City"
                  required
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <Input
                  label="State"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
                <Select
                  label="Transaction Type"
                  value={form.transaction_type}
                  onChange={(e) => setForm((f) => ({ ...f, transaction_type: e.target.value }))}
                >
                  <option value="lease">Lease</option>
                  <option value="sale">Sale</option>
                </Select>
                <Input
                  label="Transaction Date"
                  type="date"
                  required
                  value={form.transaction_date}
                  onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
                />
                <Input
                  label="Property Type"
                  value={form.property_type}
                  onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value }))}
                  hint="e.g. industrial, office, retail"
                />
                <Input
                  label="Tenant Name"
                  value={form.tenant_name}
                  onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))}
                />
                <Input
                  label="Square Footage"
                  type="number"
                  value={form.sf}
                  onChange={(e) => setForm((f) => ({ ...f, sf: e.target.value }))}
                />
                <Input
                  label="Rent per SF"
                  type="number"
                  step="0.01"
                  value={form.rent_per_sqft}
                  onChange={(e) => setForm((f) => ({ ...f, rent_per_sqft: e.target.value }))}
                />
                <Input
                  label="Monthly Rent"
                  type="number"
                  step="0.01"
                  value={form.monthly_rent}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_rent: e.target.value }))}
                />
                <Input
                  label="Lease Term (months)"
                  type="number"
                  value={form.lease_term_months}
                  onChange={(e) => setForm((f) => ({ ...f, lease_term_months: e.target.value }))}
                />
                {form.transaction_type === 'sale' && (
                  <>
                    <Input
                      label="Sale Price"
                      type="number"
                      step="0.01"
                      value={form.sale_price}
                      onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                    />
                    <Input
                      label="Price per SF"
                      type="number"
                      step="0.01"
                      value={form.price_per_sqft}
                      onChange={(e) => setForm((f) => ({ ...f, price_per_sqft: e.target.value }))}
                    />
                    <Input
                      label="Cap Rate (%)"
                      type="number"
                      step="0.01"
                      value={form.cap_rate}
                      onChange={(e) => setForm((f) => ({ ...f, cap_rate: e.target.value }))}
                    />
                  </>
                )}
                <Select
                  label="Source"
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                >
                  <option value="manual">Manual</option>
                  <option value="internal">Internal</option>
                  <option value="costar">CoStar</option>
                </Select>
              </div>

              <Textarea
                label="Notes"
                className="mt-4"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Comp' : 'Save Comp'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <DataTable
        data={comps}
        columns={columns}
        searchKeys={['address', 'city', 'tenant_name']}
        filters={[
          { key: 'transaction_type', label: 'Type', options: typeOptions },
          { key: 'source', label: 'Source', options: sourceOptions },
        ]}
        searchPlaceholder="Search by address, city, or tenant..."
        emptyIcon={BarChart3}
        emptyMessage="No comparable transactions yet"
        emptyDescription="Add comps to reference recent lease and sale transactions when drafting LOIs."
        pageSize={10}
        exportFileName="comps"
      />
    </div>
  );
}
