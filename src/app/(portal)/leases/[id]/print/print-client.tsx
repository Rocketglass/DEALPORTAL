'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDocumentDate } from '@/lib/utils';
import type { LeaseWithRelations } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullName(contact: { first_name: string | null; last_name: string | null; company_name: string | null } | null): string {
  if (!contact) return '---';
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || contact.company_name || '---';
}

function formatTermDisplay(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months && months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(', ') : '---';
}

function ordinalDay(day: string | null): string {
  if (!day) return '1st';
  const n = parseInt(day, 10);
  if (isNaN(n)) return day;
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' };
  return `${n}${suffixes[n] || 'th'}`;
}

// ---------------------------------------------------------------------------
// Print client component
// ---------------------------------------------------------------------------

interface LeasePrintClientProps {
  lease: LeaseWithRelations;
}

export default function LeasePrintClient({ lease }: LeasePrintClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const escalations = [...(lease.escalations ?? [])].sort(
    (a, b) => a.year_number - b.year_number,
  );

  const premisesAddress = [
    lease.premises_address,
    lease.premises_city,
    [lease.premises_state, lease.premises_zip].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');

  // Monies upon execution
  const execBaseRent = lease.exec_base_rent_amount ?? lease.base_rent_monthly;
  const execCam = lease.exec_cam_amount ?? null;
  const execDeposit = lease.exec_security_deposit ?? lease.security_deposit ?? null;
  const execOther = lease.exec_other_amount ?? null;
  const totalDue = lease.total_due_upon_execution ?? (
    (execBaseRent || 0) + (execCam || 0) + (execDeposit || 0) + (execOther || 0)
  );

  return (
    <>
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
            Print Lease Summary
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
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', marginBottom: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
          LEASE SUMMARY
        </h2>

        {/* Quick reference block */}
        <div style={{ marginBottom: 32, padding: '16px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: 140, paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>Property:</td>
                <td style={{ paddingBottom: 6 }}>{lease.property?.name || lease.premises_address}</td>
              </tr>
              {lease.unit?.suite_number && (
                <tr>
                  <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>Suite:</td>
                  <td style={{ paddingBottom: 6 }}>{lease.unit.suite_number}</td>
                </tr>
              )}
              <tr>
                <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>Lessor:</td>
                <td style={{ paddingBottom: 6 }}>{lease.lessor_name}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, verticalAlign: 'top', fontWeight: 600 }}>Lessee:</td>
                <td style={{ paddingBottom: 6 }}>{lease.lessee_name}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Form type */}
        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#64748b', marginBottom: 32, fontSize: 14 }}>
          {lease.form_type || 'AIR Standard Industrial/Commercial Multi-Tenant Lease'} {lease.form_version ? `(${lease.form_version})` : '--- NET'}
        </p>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #cbd5e1', marginBottom: 28 }} />

        {/* Section 1.1 -- Parties */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Section 1.1 --- Parties
          </h3>
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Lessor:</strong> {lease.lessor_name}
              {lease.lessor_entity_type ? `, ${lease.lessor_entity_type}` : ''}
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Lessee:</strong> {lease.lessee_name}
              {lease.lessee_entity_type ? `, ${lease.lessee_entity_type}` : ''}
            </p>
            {lease.reference_date && (
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Reference Date:</strong> {formatDocumentDate(lease.reference_date)}
              </p>
            )}
          </div>
        </div>

        {/* Section 1.2 -- Premises */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Section 1.2 --- Premises
          </h3>
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Address:</strong> {premisesAddress}
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Square Footage:</strong> {lease.premises_sf ? `${new Intl.NumberFormat('en-US').format(lease.premises_sf)} SF` : '---'}
            </p>
            {lease.parking_spaces != null && (
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Parking:</strong> {lease.parking_spaces} {lease.parking_type || 'unreserved'} space{lease.parking_spaces === 1 ? '' : 's'}
              </p>
            )}
            {lease.premises_description && (
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Description:</strong> {lease.premises_description}
              </p>
            )}
          </div>
        </div>

        {/* Section 1.3 -- Term */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Section 1.3 --- Term
          </h3>
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Duration:</strong> {formatTermDisplay(lease.term_years, lease.term_months)}
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Commencement:</strong> {formatDocumentDate(lease.commencement_date)}
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Expiration:</strong> {formatDocumentDate(lease.expiration_date)}
            </p>
            {lease.early_possession_terms && (
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Early Possession:</strong> {lease.early_possession_terms}
              </p>
            )}
          </div>
        </div>

        {/* Section 1.4 -- Agreed Use */}
        {lease.agreed_use && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Section 1.4 --- Agreed Use
            </h3>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ margin: 0 }}>{lease.agreed_use}</p>
            </div>
          </div>
        )}

        {/* Section 1.5 -- Base Rent */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Section 1.5 --- Base Rent
          </h3>
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Monthly Rent:</strong> {formatCurrency(lease.base_rent_monthly)}
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Payable:</strong> on the {ordinalDay(lease.base_rent_payable_day)} of each month
            </p>
            {lease.base_rent_commencement && (
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Rent Commencement:</strong> {formatDocumentDate(lease.base_rent_commencement)}
              </p>
            )}
          </div>
        </div>

        {/* Section 1.6 -- CAM */}
        {(lease.cam_percent != null || lease.cam_description) && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Section 1.6 --- Common Area Maintenance (CAM)
            </h3>
            <div style={{ paddingLeft: 16 }}>
              {lease.cam_percent != null && (
                <p style={{ margin: '0 0 4px 0' }}>
                  <strong>Percentage:</strong> {lease.cam_percent}%
                </p>
              )}
              {lease.cam_description && (
                <p style={{ margin: '0 0 4px 0' }}>{lease.cam_description}</p>
              )}
            </div>
          </div>
        )}

        {/* Section 1.7 -- Monies Upon Execution */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Section 1.7 --- Monies Due Upon Execution
          </h3>
          <div style={{ paddingLeft: 16 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 420 }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: 4 }}>Base Rent:</td>
                  <td style={{ paddingBottom: 4, textAlign: 'right' }}>{formatCurrency(execBaseRent)}</td>
                </tr>
                {execCam != null && execCam > 0 && (
                  <tr>
                    <td style={{ paddingBottom: 4 }}>CAM:</td>
                    <td style={{ paddingBottom: 4, textAlign: 'right' }}>{formatCurrency(execCam)}</td>
                  </tr>
                )}
                {execDeposit != null && execDeposit > 0 && (
                  <tr>
                    <td style={{ paddingBottom: 4 }}>Security Deposit:</td>
                    <td style={{ paddingBottom: 4, textAlign: 'right' }}>{formatCurrency(execDeposit)}</td>
                  </tr>
                )}
                {execOther != null && execOther > 0 && (
                  <tr>
                    <td style={{ paddingBottom: 4 }}>
                      {lease.exec_other_description || 'Other'}:
                    </td>
                    <td style={{ paddingBottom: 4, textAlign: 'right' }}>{formatCurrency(execOther)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ paddingTop: 8, borderTop: '1px solid #cbd5e1', fontWeight: 700 }}>Total Due:</td>
                  <td style={{ paddingTop: 8, borderTop: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(totalDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Insurance */}
        {lease.insuring_party && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Section 1.8 --- Insurance
            </h3>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ margin: 0 }}>
                <strong>Insuring Party:</strong> {lease.insuring_party}
              </p>
            </div>
          </div>
        )}

        {/* Broker */}
        {(lease.lessors_broker_name || lease.lessees_broker_name) && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Section 1.10 --- Broker(s)
            </h3>
            <div style={{ paddingLeft: 16 }}>
              {lease.lessors_broker_name && (
                <p style={{ margin: '0 0 4px 0' }}>
                  <strong>{"Lessor's"} Broker:</strong> {lease.lessors_broker_name}
                  {lease.lessors_broker_company ? `, ${lease.lessors_broker_company}` : ''}
                </p>
              )}
              {lease.lessees_broker_name && (
                <p style={{ margin: '0 0 4px 0' }}>
                  <strong>{"Lessee's"} Broker:</strong> {lease.lessees_broker_name}
                  {lease.lessees_broker_company ? `, ${lease.lessees_broker_company}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Guarantor */}
        {lease.guarantor_names && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Section 1.11 --- Guarantor(s)
            </h3>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ margin: 0 }}>{lease.guarantor_names}</p>
            </div>
          </div>
        )}

        {/* Divider before escalation schedule */}
        {escalations.length > 0 && (
          <>
            <div style={{ borderTop: '2px solid #1e40af', margin: '32px 0 28px 0' }} />

            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.03em', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
              RENT ESCALATION SCHEDULE
            </h3>

            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14, marginBottom: 32 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a' }}>
                  <th style={{ padding: '8px 12px 8px 0', textAlign: 'left', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Year</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Effective Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Monthly Rent</th>
                  <th style={{ padding: '8px 0 8px 12px', textAlign: 'right', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>Per SF</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((esc) => (
                  <tr key={esc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px 8px 0' }}>Year {esc.year_number}</td>
                    <td style={{ padding: '8px 12px' }}>{formatDocumentDate(esc.effective_date)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(esc.monthly_amount)}</td>
                    <td style={{ padding: '8px 0 8px 12px', textAlign: 'right' }}>
                      ${esc.rent_per_sqft.toFixed(2)}/SF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Divider before signatures */}
        <div style={{ borderTop: '2px solid #1e40af', margin: '32px 0 28px 0' }} />

        {/* Signatures */}
        <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.03em', marginBottom: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          SIGNATURES
        </h3>

        <div style={{ display: 'flex', gap: 48, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Lessor
            </p>
            <div style={{ borderBottom: '1px solid #0f172a', height: 40, marginBottom: 4 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{lease.lessor_name}</p>
          </div>
          <div style={{ width: 140 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Date
            </p>
            <div style={{ borderBottom: '1px solid #0f172a', height: 40, marginBottom: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 48, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Lessee
            </p>
            <div style={{ borderBottom: '1px solid #0f172a', height: 40, marginBottom: 4 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{lease.lessee_name}</p>
          </div>
          <div style={{ width: 140 }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Date
            </p>
            <div style={{ borderBottom: '1px solid #0f172a', height: 40, marginBottom: 4 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, borderTop: '1px solid #e2e8f0', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <p style={{ margin: 0 }}>Rocket Realty &middot; Commercial Real Estate Brokerage &middot; San Diego, CA</p>
        </div>
      </div>
    </>
  );
}
