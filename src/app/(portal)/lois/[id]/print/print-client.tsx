'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDocumentDate } from '@/lib/utils';
import type { Contact, LoiWithRelations } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullName(contact: Contact | null): string {
  if (!contact) return '---';
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || contact.company_name || '---';
}

function companyOrName(contact: Contact | null): string {
  if (!contact) return '---';
  if (contact.company_name) return contact.company_name;
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || '---';
}

function firstName(contact: Contact | null): string {
  if (!contact) return 'Sir/Madam';
  return contact.first_name || contact.last_name || 'Sir/Madam';
}

/**
 * Parse a key:value string like "monthlyAmount: $2,660; perSfRate: 0.95"
 * into human-readable prose. Falls back to the raw string if unparseable.
 */
function humanizeValue(raw: string): string {
  if (!raw) return '---';

  // If it doesn't contain our key:value pattern, return as-is
  if (!raw.includes(':')) return raw;

  const pairs: Record<string, string> = {};
  const segments = raw.split(';').map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const colonIdx = seg.indexOf(':');
    if (colonIdx === -1) return raw; // not parseable, bail
    const key = seg.slice(0, colonIdx).trim().toLowerCase();
    const val = seg.slice(colonIdx + 1).trim();
    pairs[key] = val;
  }

  // base_rent pattern
  if (pairs['monthlyamount'] || pairs['persfrate']) {
    const monthly = pairs['monthlyamount'] || pairs['monthly'] || null;
    const perSf = pairs['persfrate'] || pairs['persf'] || null;
    if (monthly && perSf) {
      return `${monthly} per month ($${parseFloat(perSf).toFixed(2)} per square foot)`;
    }
    if (monthly) return `${monthly} per month`;
    if (perSf) return `$${parseFloat(perSf).toFixed(2)} per square foot`;
  }

  // term pattern
  if (pairs['years'] || pairs['months']) {
    const parts: string[] = [];
    if (pairs['years']) parts.push(`${pairs['years']} year${pairs['years'] === '1' ? '' : 's'}`);
    if (pairs['months']) parts.push(`${pairs['months']} month${pairs['months'] === '1' ? '' : 's'}`);
    return parts.join(', ');
  }

  // Generic: just join values with readable separators
  const vals = Object.values(pairs).filter(Boolean);
  if (vals.length > 0) return vals.join(' | ');

  return raw;
}

// ---------------------------------------------------------------------------
// Print client component
// ---------------------------------------------------------------------------

interface LoiPrintClientProps {
  loi: LoiWithRelations;
}

export default function LoiPrintClient({ loi }: LoiPrintClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const sections = [...(loi.sections ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const propertyAddress = loi.property
    ? `${loi.property.address}, ${loi.property.city}, ${loi.property.state} ${loi.property.zip || ''}`
    : '---';

  const suiteDisplay = loi.unit?.suite_number
    ? `Suite ${loi.unit.suite_number}`
    : '';

  const tenantBusiness = companyOrName(loi.tenant);
  const landlordName = fullName(loi.landlord);
  const landlordCompany = loi.landlord?.company_name || '';

  return (
    <>
      {/* Print styles + serif font for letter body */}
      <style>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          backgroundColor: '#ffffff',
          padding: '2rem 1.5rem',
          fontFamily: 'Georgia, "Times New Roman", Times, serif',
          fontSize: 15,
          lineHeight: 1.7,
          color: '#0f172a',
        }}
      >
        {/* Action bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <Button variant="ghost" onClick={() => window.history.back()}>
            &larr; Back
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print LOI
          </Button>
        </div>

        {/* Letterhead */}
        <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #1e40af', paddingBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', color: '#1e40af', margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
            ROCKET REALTY
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Commercial Real Estate Brokerage
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0', fontFamily: 'Inter, system-ui, sans-serif' }}>
            San Diego, CA
          </p>
        </div>

        {/* Date */}
        <p style={{ marginBottom: 32 }}>
          {formatDocumentDate(loi.sent_at || loi.created_at)}
        </p>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', marginBottom: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
          LETTER OF INTENT
        </h2>

        {/* Addressee */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: 0 }}>{landlordName}</p>
          {landlordCompany && landlordCompany !== landlordName && (
            <p style={{ margin: 0 }}>{landlordCompany}</p>
          )}
        </div>

        {/* RE line */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0 }}>
            <strong>RE:</strong> {loi.property?.address || '---'}
            {suiteDisplay ? `, ${suiteDisplay}` : ''}
          </p>
          <p style={{ margin: 0, paddingLeft: 36 }}>
            Tenant: {tenantBusiness}
          </p>
        </div>

        {/* Salutation */}
        <p style={{ marginBottom: 16 }}>
          Dear {firstName(loi.landlord)},
        </p>

        {/* Intro paragraph */}
        <p style={{ marginBottom: 24 }}>
          On behalf of our client, {tenantBusiness}, we are pleased to present this Letter of Intent
          for the lease of the above-referenced premises. The following is a summary of the proposed
          terms and conditions:
        </p>

        {/* Key terms block */}
        <div style={{ marginBottom: 24, paddingLeft: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: 180, paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>PREMISES:</td>
                <td style={{ paddingBottom: 6 }}>
                  {propertyAddress}
                  {suiteDisplay ? `, ${suiteDisplay}` : ''}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>LANDLORD:</td>
                <td style={{ paddingBottom: 6 }}>
                  {landlordName}
                  {landlordCompany && landlordCompany !== landlordName ? ` / ${landlordCompany}` : ''}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>TENANT:</td>
                <td style={{ paddingBottom: 6 }}>
                  {fullName(loi.tenant)}
                  {loi.tenant?.company_name && loi.tenant.company_name !== fullName(loi.tenant)
                    ? ` / ${loi.tenant.company_name}`
                    : ''}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>DATE:</td>
                <td style={{ paddingBottom: 6 }}>
                  {formatDocumentDate(loi.created_at)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section divider */}
        <div style={{ borderTop: '1px solid #cbd5e1', marginBottom: 24 }} />

        {/* PROPOSED TERMS heading */}
        <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.03em', marginBottom: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          PROPOSED TERMS:
        </h3>

        {/* Numbered sections */}
        <div style={{ marginBottom: 32 }}>
          {sections.map((section, idx) => {
            const displayValue = section.agreed_value
              ? humanizeValue(section.agreed_value)
              : humanizeValue(section.proposed_value);
            const isAgreed = !!section.agreed_value;

            return (
              <div key={section.id} style={{ marginBottom: 20, paddingLeft: 8 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {idx + 1}. {section.section_label.toUpperCase()}
                  {isAgreed && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#16a34a', marginLeft: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
                      (Agreed)
                    </span>
                  )}
                </p>
                <p style={{ margin: '4px 0 0 20px', whiteSpace: 'pre-line' }}>
                  {displayValue}
                </p>
              </div>
            );
          })}
        </div>

        {/* Section divider */}
        <div style={{ borderTop: '1px solid #cbd5e1', marginBottom: 24 }} />

        {/* Non-binding disclaimer */}
        <p style={{ marginBottom: 24 }}>
          This Letter of Intent is not intended to be a binding agreement but rather an outline of
          the principal terms upon which a formal lease agreement would be based.
          {loi.expires_at && (
            <> This LOI shall expire if not accepted by {formatDocumentDate(loi.expires_at)}.</>
          )}
        </p>

        {/* Notes */}
        {loi.notes && (
          <div style={{ marginBottom: 24, padding: '16px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Additional Notes
            </p>
            <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-line' }}>
              {loi.notes}
            </p>
          </div>
        )}

        {/* Closing */}
        <p style={{ marginBottom: 48 }}>
          Respectfully submitted,
        </p>

        {/* Signature block */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {fullName(loi.broker)}
            {loi.broker?.company_name !== 'Rocket Realty' && ', CCIM'}
          </p>
          <p style={{ margin: 0 }}>Rocket Realty</p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            DRE #01234567
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, borderTop: '1px solid #e2e8f0', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <p style={{ margin: 0 }}>Rocket Realty &middot; Commercial Real Estate Brokerage &middot; San Diego, CA</p>
        </div>
      </div>
    </>
  );
}
