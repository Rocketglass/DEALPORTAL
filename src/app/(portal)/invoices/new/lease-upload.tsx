'use client';

import { useRef, useState } from 'react';
import { Upload, FileSearch, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface ParsedLeaseFields {
  lessor_name: string | null;
  lessor_email: string | null;
  lessor_address: string | null;
  lessee_name: string | null;
  lessee_email: string | null;
  property_address: string | null;
  suite_number: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  suite_sf: number | null;
  lease_term_months: number | null;
  monthly_rent: number | null;
  total_consideration: number | null;
  annual_escalation_percent: number | null;
  free_rent_months: number | null;
  commission_rate_percent: number | null;
  commencement_date: string | null;
}

interface LeaseUploadProps {
  onApply: (fields: ParsedLeaseFields) => void;
}

function formatCurrency(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fieldRow(label: string, value: string | number | null) {
  const display = value === null || value === '' ? '—' : String(value);
  const isMissing = display === '—';
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-[#64748b]">{label}</span>
      <span className={isMissing ? 'text-[#94a3b8]' : 'font-medium text-[#0f172a]'}>
        {display}
      </span>
    </div>
  );
}

export default function LeaseUpload({ onApply }: LeaseUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedLeaseFields | null>(null);

  function reset() {
    setFileName('');
    setParsed(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleParse() {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a lease PDF first.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('File must be a PDF.');
      return;
    }

    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/leases/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Parse failed');
        return;
      }
      setParsed(json.fields);
    } catch {
      setError('Network error — try again.');
    } finally {
      setParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? '');
    setError(null);
    setParsed(null);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[#1e40af]" />
              Pre-fill from lease PDF
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Upload an executed lease and we&apos;ll pull lessor, lessee, premises, term, rent,
              and commission rate into the form below. Review then apply.
            </p>
          </div>
          {parsed && (
            <button
              type="button"
              onClick={reset}
              aria-label="Start over"
              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!parsed && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#1e40af] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1e3a8a]"
            />
            <Button
              type="button"
              variant="primary"
              icon={Upload}
              onClick={handleParse}
              loading={parsing}
              disabled={parsing || !fileName}
            >
              {parsing ? 'Reading lease…' : 'Parse'}
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {parsed && (
          <div className="mt-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Extracted from {fileName}
            </p>
            <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
              <div>
                {fieldRow('Lessor', parsed.lessor_name)}
                {fieldRow('Lessor email', parsed.lessor_email)}
                {fieldRow('Lessor address', parsed.lessor_address)}
                {fieldRow('Lessee (tenant)', parsed.lessee_name)}
                {fieldRow('Property address', parsed.property_address)}
                {fieldRow('Suite', parsed.suite_number)}
                {fieldRow('City / State', [parsed.city, parsed.state].filter(Boolean).join(', '))}
              </div>
              <div>
                {fieldRow('Suite size (SF)', parsed.suite_sf?.toLocaleString() ?? null)}
                {fieldRow('Lease term', parsed.lease_term_months ? `${parsed.lease_term_months} mo` : null)}
                {fieldRow('Monthly rent', formatCurrency(parsed.monthly_rent))}
                {fieldRow('Total consideration', formatCurrency(parsed.total_consideration))}
                {fieldRow('Annual escalation', parsed.annual_escalation_percent ? `${parsed.annual_escalation_percent}%` : null)}
                {fieldRow('Free rent', parsed.free_rent_months ? `${parsed.free_rent_months} mo` : null)}
                {fieldRow('Commission rate', parsed.commission_rate_percent ? `${parsed.commission_rate_percent}%` : null)}
                {fieldRow('Commencement', parsed.commencement_date)}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={reset}>
                Discard
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={CheckCircle2}
                onClick={() => onApply(parsed)}
              >
                Apply to form
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
