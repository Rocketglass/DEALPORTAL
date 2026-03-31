'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDocumentDate } from '@/lib/utils';
import type { LeaseWithRelations } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ordinalDay(day: string | null): string {
  if (!day) return '1st';
  const n = parseInt(day, 10);
  if (isNaN(n)) return day;
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' };
  return `${n}${suffixes[n] || 'th'}`;
}

function formatTermDisplay(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months && months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(', ') : '---';
}

function termInMonths(years: number | null, months: number | null): number {
  return (years || 0) * 12 + (months || 0);
}

/** Blank underlined fill-in field */
function Fill({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <span
      style={{
        borderBottom: '1px solid #000',
        display: 'inline-block',
        minWidth: width || '120px',
        padding: '0 4px',
        fontWeight: 500,
      }}
    >
      {children || '\u00A0'}
    </span>
  );
}

/** Checkbox */
function CB({ checked }: { checked: boolean }) {
  return <span style={{ fontFamily: 'sans-serif', fontSize: 14 }}>{checked ? '\u2611' : '\u2610'}</span>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const PAGE_STYLE = `
@media print {
  @page {
    margin: 0.6in 0.75in;
    size: letter;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print {
    display: none !important;
  }
  .air-page {
    page-break-after: always;
    break-after: page;
  }
  .air-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
@media screen {
  .air-page {
    max-width: 8.5in;
    min-height: 10.5in;
    margin: 0 auto 24px auto;
    padding: 0.6in 0.75in;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    position: relative;
  }
}
.air-lease {
  font-family: "Times New Roman", Times, Georgia, serif;
  font-size: 10pt;
  line-height: 1.35;
  color: #000;
}
.air-lease h1 {
  font-family: "Times New Roman", Times, Georgia, serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: center;
  margin: 0 0 2pt 0;
}
.air-lease h2 {
  font-family: "Times New Roman", Times, Georgia, serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: center;
  margin: 0 0 8pt 0;
}
.air-lease p, .air-lease div {
  margin: 0;
}
.air-lease .section-title {
  font-weight: bold;
  margin-top: 6pt;
}
.air-lease .indent {
  margin-left: 24pt;
}
.air-lease .indent2 {
  margin-left: 48pt;
}
.air-lease .indent3 {
  margin-left: 72pt;
}
.air-lease .para {
  margin-top: 4pt;
  text-align: justify;
}
.air-lease .para-title {
  font-weight: bold;
}
.air-page-footer {
  position: absolute;
  bottom: 0.4in;
  left: 0.75in;
  right: 0.75in;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 8pt;
  font-family: "Times New Roman", Times, Georgia, serif;
}
.air-page-footer .initials-block {
  text-align: center;
  line-height: 1.6;
}
.air-page-footer .initials-line {
  border-top: 1px solid #000;
  width: 60px;
  margin-top: 2pt;
}
`;

// ---------------------------------------------------------------------------
// Page footer component
// ---------------------------------------------------------------------------

function PageFooter({ pageNum, totalPages }: { pageNum: number; totalPages: number }) {
  return (
    <div className="air-page-footer">
      <div className="initials-block">
        <div className="initials-line" />
        <div>INITIALS</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div>PAGE {pageNum} OF {totalPages}</div>
      </div>
      <div className="initials-block">
        <div className="initials-line" />
        <div>INITIALS</div>
      </div>
    </div>
  );
}

function CopyrightFooter() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8pt',
        marginTop: 6,
        paddingTop: 4,
        borderTop: '1px solid #ccc',
      }}
    >
      <span>&copy;1999 - AIR COMMERCIAL REAL ESTATE ASSOCIATION</span>
      <span>FORM MTN-12-4/12E</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LeasePrintClientProps {
  lease: LeaseWithRelations;
}

export default function LeasePrintClient({ lease }: LeasePrintClientProps) {
  const printTriggered = useRef(false);

  useEffect(() => {
    if (!printTriggered.current) {
      printTriggered.current = true;
      const timer = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const escalations = [...(lease.escalations ?? [])].sort(
    (a, b) => a.year_number - b.year_number,
  );

  const premisesAddress = [
    lease.premises_address,
    lease.premises_city,
    [lease.premises_state, lease.premises_zip].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  const execBaseRent = lease.exec_base_rent_amount ?? lease.base_rent_monthly;
  const execCam = lease.exec_cam_amount ?? null;
  const execDeposit = lease.exec_security_deposit ?? lease.security_deposit ?? null;
  const execOther = lease.exec_other_amount ?? null;
  const totalDue =
    lease.total_due_upon_execution ??
    (execBaseRent || 0) + (execCam || 0) + (execDeposit || 0) + (execOther || 0);

  const totalPages = 17;

  // Determine broker checkbox state
  const isLessorBroker = lease.broker_representation_type === 'lessor';
  const isLesseeBroker = lease.broker_representation_type === 'lessee';
  const isDualAgency =
    lease.broker_representation_type === 'dual' ||
    (!isLessorBroker && !isLesseeBroker);

  return (
    <>
      <style>{PAGE_STYLE}</style>

      {/* Action bar -- screen only */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '8.5in',
          margin: '16px auto',
          padding: '0 12px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <Button variant="ghost" onClick={() => window.history.back()}>
          &larr; Back
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          Print Lease
        </Button>
      </div>

      <div className="air-lease">
        {/* ================================================================
            PAGE 1 -- Header + Basic Provisions (1.1 - 1.12)
            ================================================================ */}
        <div className="air-page">
          {/* AIR Header */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', letterSpacing: '0.5pt' }}>
              AIR COMMERCIAL REAL ESTATE ASSOCIATION
            </div>
            <h2>STANDARD INDUSTRIAL/COMMERCIAL MULTI-TENANT LEASE - NET</h2>
          </div>

          {/* 1. Basic Provisions */}
          <p className="para">
            <strong>1.</strong> <span className="para-title">Basic Provisions (&quot;Basic Provisions&quot;).</span>
          </p>

          {/* 1.1 Parties */}
          <div className="indent para">
            <strong>1.1</strong>{' '}
            <span className="para-title">Parties:</span> This Lease (&quot;Lease&quot;), dated for reference purposes only{' '}
            <Fill>{formatDocumentDate(lease.reference_date)}</Fill>,
            is made by and between <Fill>{lease.lessor_name}</Fill>
            {lease.lessor_entity_type ? `, ${lease.lessor_entity_type}` : ''}
            {' '}(&quot;Lessor&quot;)
            and <Fill>{lease.lessee_name}</Fill>
            {lease.lessee_entity_type ? `, ${lease.lessee_entity_type}` : ''}
            {' '}(&quot;Lessee&quot;), (collectively the &quot;Parties&quot;, or individually a &quot;Party&quot;).
          </div>

          {/* 1.2(a) Premises */}
          <div className="indent para" style={{ marginTop: 6 }}>
            <strong>1.2(a)</strong>{' '}
            <span className="para-title">Premises:</span> That certain portion of the Project (as defined below), including all improvements therein or to be provided by Lessor
            under the terms of this Lease, commonly known by the street address of{' '}
            <Fill>{lease.premises_address}</Fill>,
            located in the City of <Fill>{lease.premises_city}</Fill>,
            County of <Fill>{lease.premises_county || '___'}</Fill>,
            State of <Fill>{lease.premises_state}</Fill>,
            with zip code <Fill>{lease.premises_zip}</Fill>,
            as outlined on Exhibit attached hereto (&quot;Premises&quot;)
            and generally described as (describe briefly the nature of the Premises):{' '}
            <Fill width="300px">
              {lease.premises_sf
                ? `${new Intl.NumberFormat('en-US').format(lease.premises_sf)} SF of ${lease.premises_description || 'industrial warehouse and office space'}`
                : lease.premises_description || '---'}
            </Fill>
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            In addition to Lessee&apos;s rights to use and occupy the Premises as hereinafter specified, Lessee shall have non-exclusive rights to any utility raceways of
            the building containing the Premises (&quot;Building&quot;) and to the Common Areas (as defined in Paragraph 2.7 below), but shall not have any rights to the roof
            or exterior walls of the Building or to any other buildings in the Project. The Premises, the Building, the Common Areas, the land upon which they are
            located, along with all other buildings and improvements thereon, are herein collectively referred to as the &quot;Project.&quot; (See also Paragraph 2)
          </div>

          {/* 1.2(b) Parking */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.2(b)</strong>{' '}
            <span className="para-title">Parking:</span>{' '}
            <Fill>{lease.parking_spaces ?? '___'}</Fill> unreserved vehicle parking spaces. (See also Paragraph 2.6)
          </div>

          {/* 1.3 Term */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.3</strong>{' '}
            <span className="para-title">Term:</span>{' '}
            <Fill>{formatTermDisplay(lease.term_years, lease.term_months)}</Fill>{' '}
            years and <Fill>{(lease.term_months || 0) % 12 > 0 ? `${(lease.term_months || 0) % 12}` : '0'}</Fill> months
            (&quot;Original Term&quot;)
            commencing <Fill>{formatDocumentDate(lease.commencement_date)}</Fill>{' '}
            (&quot;Commencement Date&quot;) and ending <Fill>{formatDocumentDate(lease.expiration_date)}</Fill>{' '}
            (&quot;Expiration Date&quot;). (See also Paragraph 3)
          </div>

          {/* 1.4 Early Possession */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.4</strong>{' '}
            <span className="para-title">Early Possession:</span> If the Premises are available Lessee may have non-exclusive possession of the Premises commencing{' '}
            <Fill width="280px">{lease.early_possession_terms || 'Upon full lease execution and receipt of insurance/check'}</Fill>{' '}
            (&quot;Early Possession Date&quot;).
            (See also Paragraphs 3.2 and 3.3)
          </div>

          {/* 1.5 Base Rent */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.5</strong>{' '}
            <span className="para-title">Base Rent:</span> ${' '}
            <Fill>{lease.base_rent_monthly ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(lease.base_rent_monthly) : '___'}</Fill>{' '}
            per month (&quot;Base Rent&quot;), payable on the <Fill>{ordinalDay(lease.base_rent_payable_day)}</Fill>{' '}
            day of each month commencing <Fill>{formatDocumentDate(lease.base_rent_commencement || lease.commencement_date)}</Fill>.
            (See also Paragraph 4)
          </div>

          <div className="indent para" style={{ marginTop: 2 }}>
            <CB checked={escalations.length > 0} /> If this box is checked, there are provisions in this Lease for the Base Rent to be adjusted. See Paragraph{' '}
            <Fill>{lease.addendum_paragraph_start || '___'}</Fill>.
          </div>

          {/* 1.6 Lessee's Share */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.6</strong>{' '}
            <span className="para-title">Lessee&apos;s Share of Common Area Operating Expenses:</span>{' '}
            <Fill>{lease.cam_percent != null ? `${lease.cam_percent}` : '___'}</Fill> percent ({' '}
            <Fill>{lease.cam_percent != null ? `${lease.cam_percent}` : '___'}</Fill> %) (&quot;Lessee&apos;s Share&quot;).
            In the event that the size of the Premises and/or the Project are modified during the term of this Lease, Lessor shall recalculate Lessee&apos;s Share to reflect
            such modification.
          </div>

          {/* 1.7 Monies */}
          <div className="indent para" style={{ marginTop: 6 }}>
            <strong>1.7</strong>{' '}
            <span className="para-title">Base Rent and Other Monies Paid Upon Execution:</span>
          </div>
          <div className="indent2 para">
            (a) Base Rent: <Fill>{formatCurrency(execBaseRent)}</Fill>{' '}
            for the period <Fill>{lease.exec_base_rent_period || formatDocumentDate(lease.commencement_date)}</Fill>.
          </div>
          <div className="indent2 para">
            (b) Common Area Operating Expenses: <Fill>{formatCurrency(execCam)}</Fill>{' '}
            for the period <Fill>{lease.exec_cam_period || formatDocumentDate(lease.commencement_date)}</Fill>.
          </div>
          <div className="indent2 para">
            (c) Security Deposit: <Fill>{formatCurrency(execDeposit)}</Fill>{' '}
            (&quot;Security Deposit&quot;). (See also Paragraph 5)
          </div>
          <div className="indent2 para">
            (d) Other: $<Fill>{execOther ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(execOther) : '___'}</Fill>{' '}
            for <Fill>{lease.exec_other_description || '___'}</Fill>.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) Total Due Upon Execution of this Lease: <Fill>{formatCurrency(totalDue)}</Fill>.
          </div>

          {/* 1.8 Agreed Use */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.8</strong>{' '}
            <span className="para-title">Agreed Use:</span>{' '}
            <Fill width="350px">{lease.agreed_use || '___'}</Fill>
          </div>

          {/* 1.9 Insuring Party */}
          <div className="indent para" style={{ marginTop: 8 }}>
            <strong>1.9</strong>{' '}
            <span className="para-title">Insuring Party.</span>{' '}
            {lease.insuring_party}
            {' '}is the &quot;Insuring Party&quot;. (See also Paragraph 8)
          </div>

          {/* 1.10 Real Estate Brokers */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.10</strong>{' '}
            <span className="para-title">Real Estate Brokers:</span> (See also Paragraph 15 and 25)
          </div>
          <div className="indent2 para">
            (a) <strong>Representation:</strong> The following real estate brokers (the &quot;Brokers&quot;) and brokerage relationships exist in this transaction
            (check applicable boxes):
          </div>
          <div className="indent2 para" style={{ marginTop: 2 }}>
            <CB checked={isLessorBroker} />{' '}
            <Fill>{isLessorBroker ? (lease.lessors_broker_name || '___') : '___'}</Fill>{' '}
            represents Lessor exclusively (&quot;Lessor&apos;s Broker&quot;);
          </div>
          <div className="indent2 para">
            <CB checked={isLesseeBroker} />{' '}
            <Fill>{isLesseeBroker ? (lease.lessees_broker_name || '___') : '___'}</Fill>{' '}
            represents Lessee exclusively (&quot;Lessee&apos;s Broker&quot;); or
          </div>
          <div className="indent2 para">
            <CB checked={isDualAgency} />{' '}
            <Fill>{isDualAgency ? (lease.lessors_broker_name || lease.lessees_broker_name || '___') : '___'}</Fill>{' '}
            represents both Lessor and Lessee (&quot;Dual Agency&quot;).
          </div>
          <div className="indent2 para" style={{ marginTop: 2 }}>
            (b) <strong>Payment to Brokers:</strong> Upon execution and delivery of this Lease by both Parties, Lessor shall pay to the Brokers for the
            brokerage services rendered by the Brokers the fee agreed to in the attached a separate written agreement or if no such agreement is attached, the sum
            of <Fill>{lease.broker_payment_terms || '___'}</Fill>.
          </div>

          {/* 1.11 Guarantor */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.11</strong>{' '}
            <span className="para-title">Guarantor.</span> The obligations of the Lessee under this Lease are to be guaranteed by{' '}
            <Fill width="280px">{lease.guarantor_names || 'N/A'}</Fill>{' '}
            (&quot;Guarantor&quot;). (See also Paragraph 37)
          </div>

          {/* 1.12 Attachments */}
          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>1.12</strong>{' '}
            <span className="para-title">Attachments.</span> Attached hereto are the following, all of which constitute a part of this Lease:
          </div>
          <div className="indent2 para">
            <CB checked={!!(lease.addendum_paragraph_start && lease.addendum_paragraph_end)} />{' '}
            an Addendum consisting of Paragraphs{' '}
            <Fill>{lease.addendum_paragraph_start || '___'}</Fill> through{' '}
            <Fill>{lease.addendum_paragraph_end || '___'}</Fill>;
          </div>
          <div className="indent2 para">
            <CB checked={lease.has_site_plan_premises} /> a site plan depicting the Premises;
          </div>
          <div className="indent2 para">
            <CB checked={lease.has_site_plan_project} /> a site plan depicting the Project;
          </div>
          <div className="indent2 para">
            <CB checked={lease.has_rules_and_regulations} /> a current set of the Rules and Regulations for the Project;
          </div>
          <div className="indent2 para">
            <CB checked={false} /> a current set of the Rules and Regulations adopted by the owners&apos; association;
          </div>
          <div className="indent2 para">
            <CB checked={false} /> a Work Letter;
          </div>
          <div className="indent2 para">
            <CB checked={!!lease.other_attachments} /> other (specify): <Fill width="350px">{lease.other_attachments || ''}</Fill>
          </div>

          <PageFooter pageNum={1} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 2 -- Paragraphs 2 through 2.5
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            <strong>2.</strong>{' '}
            <span className="para-title">Premises.</span>
          </p>

          <div className="indent para">
            <strong>2.1</strong>{' '}
            <span className="para-title">Letting.</span>{' '}
            Lessor hereby leases to Lessee, and Lessee hereby leases from Lessor, the Premises, for the term, at the rental, and
            upon all of the terms, covenants and conditions set forth in this Lease. While the approximate square footage of the Premises may have been used in
            the marketing of the Premises for purposes of comparison, the Base Rent stated herein is NOT tied to square footage and is not subject to adjustment
            should the actual size be determined to be different.{' '}
            <strong>NOTE: Lessee is advised to verify the actual size prior to executing this Lease.</strong>
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.2</strong>{' '}
            <span className="para-title">Condition.</span>{' '}
            Lessor shall deliver that portion of the Premises contained within the Building (&quot;Unit&quot;) to Lessee broom clean and free
            of debris on the Commencement Date or the Early Possession Date, whichever first occurs (&quot;Start Date&quot;), and, so long as the required service
            contracts described in Paragraph 7.1(b) below are obtained by Lessee and in effect within thirty days following the Start Date, warrants that the existing
            electrical, plumbing, fire sprinkler, lighting, heating, ventilating and air conditioning systems (&quot;HVAC&quot;), loading doors, sump pumps, if any, and all other
            such elements in the Unit, other than those constructed by Lessee, shall be in good operating condition on said date, that the structural elements of the
            roof, bearing walls and foundation of the Unit shall be free of material defects, and that the Unit does not contain hazardous levels of any mold or fungi
            defined as toxic under applicable state or federal law. If a non-compliance with such warranty exists as of the Start Date, or if one of such systems or
            elements should malfunction or fail within the appropriate warranty period, Lessor shall, as Lessor&apos;s sole obligation with respect to such matter, except
            as otherwise provided in this Lease, promptly after receipt of written notice from Lessee setting forth with specificity the nature and extent of such
            non-compliance, malfunction or failure, rectify same at Lessor&apos;s expense. The warranty periods shall be as follows: (i) 6 months as to the HVAC
            systems, and (ii) 30 days as to the remaining systems and other elements of the Unit. If Lessee does not give Lessor the required notice within the
            appropriate warranty period, correction of any such non-compliance, malfunction or failure shall be the obligation of Lessee at Lessee&apos;s sole cost and
            expense (except for the repairs to the fire sprinkler systems, roof, foundations, and/or bearing walls - see Paragraph 7).
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.3</strong>{' '}
            <span className="para-title">Compliance.</span>{' '}
            Lessor warrants that to the best of its knowledge the improvements on the Premises and the Common Areas comply
            with the building codes that were in effect at the time that each such improvement, or portion thereof, was constructed, and also with all applicable laws,
            covenants or restrictions of record, regulations, and ordinances in effect on the Start Date (&quot;Applicable Requirements&quot;). Said warranty does not apply
            to the use to which Lessee will put the Premises, modifications which may be required by the Americans with Disabilities Act or any similar laws as a
            result of Lessee&apos;s use (see Paragraph 49), or to any Alterations or Utility Installations (as defined in Paragraph 7.3(a)) made or to be made by Lessee.{' '}
            <strong>NOTE: Lessee is responsible for determining whether or not the Applicable Requirements and especially the zoning are appropriate for
            Lessee&apos;s intended use, and acknowledges that past uses of the Premises may no longer be allowed.</strong>{' '}
            If the Premises do not comply with said
            warranty, Lessor shall, except as otherwise provided, promptly after receipt of written notice from Lessee setting forth with specificity the nature and
            extent of such non-compliance, rectify the same at Lessor&apos;s expense. If Lessee does not give Lessor written notice of a non-compliance with this
            warranty within 6 months following the Start Date, correction of that non-compliance shall be the obligation of Lessee at Lessee&apos;s sole cost and
            expense. If the Applicable Requirements are hereafter changed so as to require during the term of this Lease the construction of an addition to or an
            alteration of the Unit, Premises and/or Building (&quot;Capital Expenditure&quot;), Lessor and Lessee shall allocate the cost of such work as follows:
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (a) Subject to Paragraph 2.3(c) below, if such Capital Expenditures are required as a result of the specific and unique use of
            the Premises by Lessee as compared with uses by tenants in general, Lessee shall be fully responsible for the cost thereof, provided, however that if
            such Capital Expenditure is required during the last 2 years of this Lease and the cost thereof exceeds 6 months&apos; Base Rent, Lessee may instead
            terminate this Lease unless Lessor notifies Lessee, in writing, within 10 days after receipt of Lessee&apos;s termination notice that Lessor has elected to pay
            the difference between the actual cost thereof and the amount equal to 6 months&apos; Base Rent. If Lessee elects termination, Lessee shall immediately
            cease the use of the Premises which requires such Capital Expenditure and deliver to Lessor written notice specifying a termination date at least 90
            days thereafter. Such termination date shall, however, in no event be earlier than the last day that Lessee could legally utilize the Premises without
            commencing such Capital Expenditure.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) If such Capital Expenditure is not the result of the specific and unique use of the Premises by Lessee (such as,
            governmentally mandated seismic modifications), then Lessor shall pay for such Capital Expenditure and Lessee shall only be obligated to pay, each
            month during the remainder of the term of this Lease or any extension thereof, on the date that on which the Base Rent is due, an amount equal to
            1/144th of the portion of such costs reasonably attributable to the Premises. Lessee shall pay Interest on the balance but may prepay its obligation at
            any time. If, however, such Capital Expenditure is required during the last 2 years of this Lease or if Lessor reasonably determines that it is not
            economically feasible to pay its share thereof, Lessor shall have the option to terminate this Lease upon 90 days prior written notice to Lessee unless
            Lessee notifies Lessor, in writing, within 10 days after receipt of Lessor&apos;s termination notice that Lessee will pay for such Capital Expenditure. If Lessor
            does not elect to terminate, and fails to tender its share of any such Capital Expenditure, Lessee may advance such funds and deduct same, with
            Interest, from Rent until Lessor&apos;s share of such costs have been fully paid. If Lessee is unable to finance Lessor&apos;s share, or if the balance of the Rent
            due and payable for the remainder of this Lease is not sufficient to fully reimburse Lessee on an offset basis, Lessee shall have the right to terminate
            this Lease upon 30 days written notice to Lessor.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) Notwithstanding the above, the provisions concerning Capital Expenditures are intended to apply only to non-voluntary,
            unexpected, and new Applicable Requirements. If the Capital Expenditures are instead triggered by Lessee as a result of an actual or proposed
            change in use, change in intensity of use, or modification to the Premises then, and in that event, Lessee shall either: (i) immediately cease such
            changed use or intensity of use and/or take such other steps as may be necessary to eliminate the requirement for such Capital Expenditure, or (ii)
            complete such Capital Expenditure at its own expense. Lessee shall not have any right to terminate this Lease.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.4</strong>{' '}
            <span className="para-title">Acknowledgements.</span>{' '}
            Lessee acknowledges that: (a) it has been given an opportunity to inspect and measure the Premises, (b) it
            has been advised by Lessor and/or Brokers to satisfy itself with respect to the size and condition of the Premises (including but not limited to the
            electrical, HVAC and fire sprinkler systems, security, environmental aspects, and compliance with Applicable Requirements and the Americans with
            Disabilities Act), and their suitability for Lessee&apos;s intended use, (c) Lessee has made such investigation as it deems necessary with reference to
            such matters and assumes all responsibility therefor as the same relate to its occupancy of the Premises, (d) it is not relying on any representation as to the
            size of the Premises made by Brokers or Lessor, (e) the square footage of the Premises was not material to Lessee&apos;s decision to lease the Premises
            and pay the Rent stated herein, and (f) neither Lessor, Lessor&apos;s agents, nor Brokers have made any oral or written representations or warranties with
            respect to said matters other than as set forth in this Lease. In addition, Lessor acknowledges that: (i) Brokers have made no representations,
            promises or warranties concerning Lessee&apos;s ability to honor the Lease or suitability to occupy the Premises, and (ii) it is Lessor&apos;s sole responsibility to
            investigate the financial capability and/or suitability of all proposed tenants.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.5</strong>{' '}
            <span className="para-title">Lessee as Prior Owner/Occupant.</span>{' '}
            The warranties made by Lessor in Paragraph 2 shall be of no force or effect if immediately
            prior to the Start Date Lessee was the owner or occupant of the Premises. In such event, Lessee shall be responsible for any necessary corrective
          </div>

          <PageFooter pageNum={2} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 3 -- 2.5 (cont) through 4.1
            ================================================================ */}
        <div className="air-page">
          <p className="para">work.</p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.6</strong>{' '}
            <span className="para-title">Vehicle Parking.</span>{' '}
            Lessee shall be entitled to use the number of parking spaces specified in Paragraph 1.2(b) on those portions of
            the Common Areas designated from time to time by Lessor for parking. Lessee shall not use more parking spaces than said number. Said parking
            spaces shall be used for parking by vehicles no larger than full-size passenger automobiles or pick-up trucks, herein called &quot;Permitted Size Vehicles.&quot;
            Lessor may regulate the loading and unloading of vehicles by adopting Rules and Regulations as provided in Paragraph 2.9. No vehicles other than
            Permitted Size Vehicles may be parked in the Common Area without the prior written permission of Lessor. In addition:
          </div>

          <div className="indent2 para">
            (a) Lessee shall not permit or allow any vehicles that belong to or are controlled by Lessee or Lessee&apos;s employees,
            suppliers, shippers, customers, contractors or invitees to be loaded, unloaded, or parked in areas other than those designated by Lessor for such
            activities.
          </div>
          <div className="indent2 para">
            (b) Lessee shall not service or store any vehicles in the Common Areas.
          </div>
          <div className="indent2 para">
            (c) If Lessee permits or allows any of the prohibited activities described in this Paragraph 2.6, Lessor shall have the
            right, without notice, in addition to such other rights and remedies that it may have, to remove or tow away the vehicle involved and charge the cost to
            Lessee, which cost shall be immediately payable upon demand by Lessor.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.7</strong>{' '}
            <span className="para-title">Common Areas - Definition.</span>{' '}
            The term &quot;Common Areas&quot; is defined as all areas and facilities outside the Premises and within the
            exterior boundary line of the Project and interior utility raceways and installations within the Unit that are provided and designated by the Lessor from
            time to time for the general non-exclusive use of Lessor, Lessee and other tenants of the Project and their respective employees, suppliers, shippers,
            customers, contractors and invitees, including parking areas, loading and unloading areas, trash areas, roadways, walkways, driveways and
            landscaped areas.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.8</strong>{' '}
            <span className="para-title">Common Areas - Lessee&apos;s Rights.</span>{' '}
            Lessor grants to Lessee, for the benefit of Lessee and its employees, suppliers, shippers,
            contractors, customers and invitees, during the term of this Lease, the non-exclusive right to use, in common with others entitled to such use, the
            Common Areas as they exist from time to time, subject to any rights, powers, and privileges reserved by Lessor under the terms hereof or under the
            terms of any rules and regulations or restrictions governing the use of the Project. Under no circumstances shall the right herein granted to use the
            Common Areas be deemed to include the right to store any property, temporarily or permanently, in the Common Areas. Any such storage shall be
            permitted only by the prior written consent of Lessor or Lessor&apos;s designated agent, which consent may be revoked at any time. In the event that any
            unauthorized storage shall occur then Lessor shall have the right, without notice, in addition to such other rights and remedies that it may have, to
            remove the property and charge the cost to Lessee, which cost shall be immediately payable upon demand by Lessor.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.9</strong>{' '}
            <span className="para-title">Common Areas - Rules and Regulations.</span>{' '}
            Lessor or such other person(s) as Lessor may appoint shall have the exclusive control
            and management of the Common Areas and shall have the right, from time to time, to establish, modify, amend and enforce reasonable rules and
            regulations (&quot;Rules and Regulations&quot;) for the management, safety, care, and cleanliness of the grounds, the parking and unloading of vehicles and
            the preservation of good order, as well as for the convenience of other occupants or tenants of the Building and the Project and their invitees. Lessee
            agrees to abide by and conform to all such Rules and Regulations, and shall use its best efforts to cause its employees, suppliers, shippers, customers,
            contractors and invitees to so abide and conform. Lessor shall not be responsible to Lessee for the non-compliance with said Rules and Regulations by
            other tenants of the Project.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>2.10</strong>{' '}
            <span className="para-title">Common Areas - Changes.</span>{' '}
            Lessor shall have the right, in Lessor&apos;s sole discretion, from time to time:
          </div>
          <div className="indent2 para">
            (a) To make changes to the Common Areas, including, without limitation, changes in the location, size, shape and number of
            driveways, entrances, parking spaces, parking areas, loading and unloading areas, ingress, egress, direction of traffic, landscaped areas, walkways and
            utility raceways;
          </div>
          <div className="indent2 para">
            (b) To close temporarily any of the Common Areas for maintenance purposes so long as reasonable access to the Premises
            remains available;
          </div>
          <div className="indent2 para">(c) To designate other land outside the boundaries of the Project to be a part of the Common Areas;</div>
          <div className="indent2 para">(d) To add additional buildings and improvements to the Common Areas;</div>
          <div className="indent2 para">
            (e) To use the Common Areas while engaged in making additional improvements, repairs or alterations to the Project, or any
            portion thereof; and
          </div>
          <div className="indent2 para">
            (f) To do and perform such other acts and make such other changes in, to or with respect to the Common Areas and Project
            as Lessor may, in the exercise of sound business judgment, deem to be appropriate.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>3.</strong>{' '}
            <span className="para-title">Term.</span>
          </p>

          <div className="indent para">
            <strong>3.1</strong>{' '}
            <span className="para-title">Term.</span>{' '}
            The Commencement Date, Expiration Date and Original Term of this Lease are as specified in Paragraph 1.3.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>3.2</strong>{' '}
            <span className="para-title">Early Possession.</span>{' '}
            Any provision herein granting Lessee Early Possession of the Premises is subject to and conditioned upon the
            Premises being available for such possession prior to the Commencement Date. Any grant of Early Possession only conveys a non-exclusive right to
            occupy the Premises. If Lessee totally or partially occupies the Premises prior to the Commencement Date, the obligation to pay Base Rent shall be
            abated for the period of such Early Possession. All other terms of this Lease (including but not limited to the obligations to pay Lessee&apos;s Share of
            Common Area Operating Expenses, Real Property Taxes and insurance premiums and to maintain the Premises) shall be in effect during such period.
            Any such Early Possession shall not affect the Expiration Date.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>3.3</strong>{' '}
            <span className="para-title">Delay In Possession.</span>{' '}
            Lessor agrees to use its best commercially reasonable efforts to deliver possession of the Premises to
            Lessee by the Commencement Date. If, despite said efforts, Lessor is unable to deliver possession by such date, Lessor shall not be subject to any
            liability therefor, nor shall such failure affect the validity of this Lease or change the Expiration Date. Lessee shall not, however, be obligated to pay Rent
            or perform its other obligations until Lessor delivers possession of the Premises and any period of rent abatement that Lessee would otherwise have
            enjoyed shall run from the date of delivery of possession and continue for a period equal to what Lessee would otherwise have enjoyed under the terms
            hereof, but minus any days of delay caused by the acts or omissions of Lessee. If possession is not delivered within 60 days after the Commencement
            Date, as the same may be extended under the terms of any Work Letter executed by Parties, Lessee may, at its option, by notice in writing within 10
            days after the end of such 60 day period, cancel this Lease, in which event the Parties shall be discharged from all obligations hereunder. If such
            written notice is not received by Lessor within said 10 day period, Lessee&apos;s right to cancel shall terminate. If possession of the Premises is not
            delivered within 120 days after the Commencement Date, this Lease shall terminate unless other agreements are reached between Lessor and Lessee,
            in writing.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>3.4</strong>{' '}
            <span className="para-title">Lessee Compliance.</span>{' '}
            Lessor shall not be required to tender possession of the Premises to Lessee until Lessee complies with its
            obligation to provide evidence of insurance (Paragraph 8.5). Pending delivery of such evidence, Lessee shall be required to perform all of its
            obligations under this Lease from and after the Start Date, including the payment of Rent, notwithstanding Lessor&apos;s election to withhold possession.
            Further, if Lessee is required to perform any other conditions prior to or concurrent with the Start Date,
            the Start Date shall occur but Lessor may elect to withhold possession until such conditions are satisfied.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>4.</strong>{' '}
            <span className="para-title">Rent.</span>
          </p>

          <div className="indent para">
            <strong>4.1</strong>{' '}
            <span className="para-title">Rent Defined.</span>{' '}
            All monetary obligations of Lessee to Lessor under the terms of this Lease (except for the Security Deposit) are
            deemed to be rent (&quot;Rent&quot;).
          </div>

          <PageFooter pageNum={3} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 4 -- 4.2 through 5
            ================================================================ */}
        <div className="air-page">
          <div className="indent para">
            <strong>4.2</strong>{' '}
            <span className="para-title">Common Area Operating Expenses.</span>{' '}
            Lessee shall pay to Lessor during the term hereof, in addition to the Base Rent, Lessee&apos;s
            Share (as specified in Paragraph 1.6) of all Common Area Operating Expenses, as hereinafter defined, during each calendar year of the term of this
            Lease, in accordance with the following provisions:
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (a) &quot;Common Area Operating Expenses&quot; are defined, for purposes of this Lease, as all costs incurred by Lessor relating
            to the ownership and operation of the Project, including, but not limited to, the following:
          </div>
          <div className="indent3 para">
            (i) The operation, repair and maintenance, in neat, clean, good order and condition, and if necessary the
            replacement, of the following:
          </div>
          <div className="indent3 para" style={{ marginLeft: 96 }}>
            (aa) The Common Areas and Common Area improvements, including parking areas, loading and
            unloading areas, trash areas, roadways, parkways, walkways, driveways, landscaped areas, bumpers, irrigation systems, Common Area lighting
            facilities, fences and gates, elevators, roofs, exterior walls of the buildings, building systems and roof drainage systems.
          </div>
          <div className="indent3 para" style={{ marginLeft: 96 }}>(bb) Exterior signs and any tenant directories.</div>
          <div className="indent3 para" style={{ marginLeft: 96 }}>(cc) Any fire sprinkler systems.</div>
          <div className="indent3 para" style={{ marginLeft: 96 }}>
            (dd) All other areas and improvements that are within the exterior boundaries of the Project but outside of
            the Premises and/or any other space occupied by a tenant.
          </div>
          <div className="indent3 para">
            (ii) The cost of water, gas, electricity and telephone to service the Common Areas and any utilities not separately
            metered.
          </div>
          <div className="indent3 para">
            (iii) The cost of trash disposal, pest control services, property management, security services, owners&apos; association
            dues and fees, the cost to repaint the exterior of any structures and the cost of any environmental inspections.
          </div>
          <div className="indent3 para">
            (iv) Reserves set aside for maintenance, repair and/or replacement of Common Area improvements and
            equipment.
          </div>
          <div className="indent3 para">(v) Real Property Taxes (as defined in Paragraph 10).</div>
          <div className="indent3 para">(vi) The cost of the premiums for the insurance maintained by Lessor pursuant to Paragraph 8.</div>
          <div className="indent3 para">(vii) Any deductible portion of an insured loss concerning the Building or the Common Areas.</div>
          <div className="indent3 para">
            (viii) Auditors&apos;, accountants&apos; and attorneys&apos; fees and costs related to the operation, maintenance, repair and
            replacement of the Project.
          </div>
          <div className="indent3 para">
            (ix) The cost of any capital improvement to the Building or the Project not covered under the provisions of
            Paragraph 2.3 provided; however, that Lessor shall allocate the cost of any such capital improvement over a 12 year period and Lessee shall not be
            required to pay more than Lessee&apos;s Share of 1/144th of the cost of such capital improvement in any given month.
          </div>
          <div className="indent3 para">
            (x) The cost of any other services to be provided by Lessor that are stated elsewhere in this Lease to be a
            Common Area Operating Expense.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) Any Common Area Operating Expenses and Real Property Taxes that are specifically attributable to the Unit, the
            Building or to any other building in the Project or to the operation, repair and maintenance thereof, shall be allocated entirely to such Unit, Building, or
            other building. However, any Common Area Operating Expenses and Real Property Taxes that are not specifically attributable to the Building or to any
            other building or to the operation, repair and maintenance thereof, shall be equitably allocated by Lessor to all buildings in the Project.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) The inclusion of the improvements, facilities and services set forth in Subparagraph 4.2(a) shall not be deemed to impose
            an obligation upon Lessor to either have said improvements or facilities or to provide those services unless the Project already has the same, Lessor
            already provides the services, or Lessor has agreed elsewhere in this Lease to provide the same or some of them.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) Lessee&apos;s Share of Common Area Operating Expenses is payable monthly on the same day as the Base Rent is due
            hereunder. The amount of such payments shall be based on Lessor&apos;s estimate of the annual Common Area Operating Expenses. Within 60 days after
            written request (but not more than once each year) Lessor shall deliver to Lessee a reasonably detailed statement showing Lessee&apos;s Share of the
            actual Common Area Operating Expenses for the preceding year. If Lessee&apos;s payments during such year exceed Lessee&apos;s Share, Lessor shall credit
            the amount of such over-payment against Lessee&apos;s future payments. If Lessee&apos;s payments during such year were less than Lessee&apos;s Share, Lessee
            shall pay to Lessor the amount of the deficiency within 10 days after delivery by Lessor to Lessee of the statement.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) Common Area Operating Expenses shall not include any expenses paid by any tenant directly to third parties, or as to
            which Lessor is otherwise reimbursed by any third party, other tenant, or insurance proceeds.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>4.3</strong>{' '}
            <span className="para-title">Payment.</span>{' '}
            Lessee shall cause payment of Rent to be received by Lessor in lawful money of the United States, without offset or
            deduction (except as specifically permitted in this Lease), on or before the day on which it is due. All monetary amounts shall be rounded to the nearest
            whole dollar. In the event that any invoice prepared by Lessor is inaccurate such inaccuracy shall not constitute a waiver and Lessee shall be obligated
            to pay the amount set forth in this Lease. Rent for any period during the term hereof which is for less than one full calendar month shall be prorated
            based upon the actual number of days of said month. Payment of Rent shall be made to Lessor at its address stated herein or to such other persons or
            place as Lessor may from time to time designate in writing. Acceptance of a payment which is less than the amount then due shall not be a waiver of
            Lessor&apos;s rights to the balance of such Rent, regardless of Lessor&apos;s endorsement of any check or draft, or other
            instrument of payment given by Lessee to Lessor is dishonored for any reason, Lessee agrees to pay to Lessor the sum of $25 in addition to any Late
            Charge and Lessor, at its option, may require all future Rent be paid by cashier&apos;s check. Payments will be applied first to accrued late charges and
            attorney&apos;s fees, second to accrued interest, then to Base Rent and Common Area Operating Expenses, and any remaining amount to any other
            outstanding charges or costs.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>5.</strong>{' '}
            <span className="para-title">Security Deposit.</span>{' '}
            Lessee shall deposit with Lessor upon execution hereof the Security Deposit as security for Lessee&apos;s faithful performance
            of its obligations under this Lease. If Lessee fails to pay Rent, or otherwise Defaults under this Lease, Lessor may use, apply or retain all or any portion
            of said Security Deposit for the payment of any amount already due Lessor, for Rents which will be due in the future, and/ or to reimburse or
            compensate Lessor for any liability, expense, loss or damage which Lessor may suffer or incur by reason thereof. If Lessor uses or applies all or any
            portion of the Security Deposit, Lessee shall within 10 days after written request therefor deposit monies with Lessor sufficient to restore said Security
            Deposit to the full amount required by this Lease. If the Base Rent increases during the term of this Lease, Lessee shall, upon written request from
            Lessor, deposit additional monies with Lessor so that the total amount of the Security Deposit shall at all times bear the same proportion to the
            increased Base Rent as the initial Security Deposit bore to the initial Base Rent. Should the Agreed Use be amended to accommodate a material
            change in the business of Lessee or to accommodate a sublessee or assignee, Lessor shall have the right to increase the Security Deposit to the
            extent necessary, in Lessor&apos;s reasonable judgment, to account for any increased wear and tear that the Premises may suffer as a result thereof. If a
            change in control of Lessee occurs during this Lease and following such change the financial condition of Lessee is, in Lessor&apos;s reasonable judgment,
            significantly reduced, Lessee shall deposit such additional monies with Lessor as shall be sufficient to cause the Security Deposit to be at a
            commercially reasonable level based on such change in financial condition. Lessor shall not be required to keep the Security Deposit separate from its
            general accounts. Within 90 days after the expiration or termination of this Lease, Lessor shall return that portion of the Security Deposit not used or
            applied by Lessor. No part of the Security Deposit shall be considered to be held in trust, to bear interest or to be prepayment for any monies to be paid
            by Lessee under this Lease.
          </p>

          <PageFooter pageNum={4} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 5 -- 6 through 6.3
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            <strong>6.</strong>{' '}
            <span className="para-title">Use.</span>
          </p>

          <div className="indent para">
            <strong>6.1</strong>{' '}
            <span className="para-title">Use.</span>{' '}
            Lessee shall use and occupy the Premises only for the Agreed Use, or any other legal use which is reasonably comparable
            thereto, and for no other purpose. Lessee shall not use or permit the use of the Premises in a manner that is unlawful, creates damage, waste or a
            nuisance, or that disturbs occupants of or causes damage to neighboring premises or properties. Other than guide, signal and seeing eye dogs, Lessee
            shall not keep or allow in the Premises any pets, animals, birds, fish, or reptiles. Lessor shall not unreasonably withhold or delay its consent to any
            written request for a modification of the Agreed Use, so long as the same will not impair the structural integrity of the Building or the mechanical or
            electrical systems therein, and/or is not significantly more burdensome to the Project. If Lessor elects to withhold consent, Lessor shall within 7 days
            after such request give written notification of same, which notice shall include an explanation of Lessor&apos;s objections to the change in the Agreed Use.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>6.2</strong>{' '}
            <span className="para-title">Hazardous Substances.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Reportable Uses Require Consent.</span>{' '}
            The term &quot;Hazardous Substance&quot; as used in this Lease shall mean any product,
            substance, or waste whose presence, use, manufacture, disposal, transportation, or release, either by itself or in combination with other materials
            expected to be on the Premises, is either: (i) potentially injurious to the public health, safety or welfare, the environment or the Premises, (ii) regulated
            or monitored by any governmental authority, or (iii) a basis for potential liability of Lessor to any governmental agency or third party under any applicable
            statute or common law theory. Hazardous Substances shall include, but not be limited to, hydrocarbons, petroleum, gasoline, and/or crude oil or any
            products, by-products or fractions thereof. Lessee shall not engage in any activity in or on the Premises which constitutes a Reportable Use of
            Hazardous Substances without the express prior written consent of Lessor and timely compliance (at Lessee&apos;s expense) with all Applicable
            Requirements. &quot;Reportable Use&quot; shall mean (i) the installation or use of any above or below ground storage tank, (ii) the generation, possession,
            storage, use, transportation, or disposal of a Hazardous Substance that requires a permit from, or with respect to which a report, notice, registration or
            business plan is required to be filed with, any governmental authority, and/or (iii) the presence at the Premises of a Hazardous Substance with respect
            to which any Applicable Requirements requires that a notice be given to persons entering or occupying the Premises or neighboring properties.
            Notwithstanding the foregoing, Lessee may use any ordinary and customary materials reasonably required to be used in the normal course of the
            Agreed Use, ordinary office supplies (copier toner, liquid paper, glue, etc.) and common household cleaning materials, so long as such use is in
            compliance with all Applicable Requirements, is not a Reportable Use, and does not expose the Premises or neighboring property to any meaningful
            risk of contamination or damage or expose Lessor to any liability therefor. In addition, Lessor may condition its consent to any Reportable Use upon
            receiving such additional assurances as Lessor reasonably deems necessary to protect itself, the public, the Premises and/or the environment against
            damage, contamination, injury and/or liability, including, but not limited to, the installation (and removal on or before Lease expiration or termination) of
            protective modifications (such as concrete encasements) and/or increasing the Security Deposit.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Duty to Inform Lessor.</span>{' '}
            If Lessee knows, or has reasonable cause to believe, that a Hazardous Substance has come to
            be located in, on, under or about the Premises, other than as previously consented to by Lessor, Lessee shall immediately give written notice of such
            fact to Lessor, and provide Lessor with a copy of any report, notice, claim or other documentation which it has concerning the presence of such
            Hazardous Substance.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Lessee Remediation.</span>{' '}
            Lessee shall not cause or permit any Hazardous Substance to be spilled or released in, on,
            under, or about the Premises (including through the plumbing or sanitary sewer system) and shall promptly, at Lessee&apos;s expense, comply with all
            Applicable Requirements and take all investigatory and/or remedial action reasonably recommended, whether or not formally ordered or required, for
            the cleanup of any contamination of, and for the maintenance, security and/or monitoring of the Premises or neighboring properties, that was caused or
            materially contributed to by Lessee, or pertaining to or involving any Hazardous Substance brought onto the Premises during the term of this Lease, by
            or for Lessee, or any third party.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d){' '}
            <span className="para-title">Lessee Indemnification.</span>{' '}
            Lessee shall indemnify, defend and hold Lessor, its agents, employees, lenders and ground
            lessor, if any, harmless from and against any and all loss of rents and/or damages, liabilities, judgments, claims, expenses, penalties, and attorneys&apos;
            and consultants&apos; fees arising out of or involving any Hazardous Substance brought onto the Premises by or for Lessee, or any third party (provided,
            however, that Lessee shall have no liability under this Lease with respect to underground migration of any Hazardous Substance under the Premises
            from areas outside of the Project not caused or contributed to by Lessee). Lessee&apos;s obligations shall include, but not be limited to, the effects of any
            contamination or injury to person, property or the environment created or suffered by Lessee, and the cost of investigation, removal, remediation,
            restoration and/or abatement, and shall survive the expiration or termination of this Lease. No termination, cancellation or release agreement entered
            into by Lessor and Lessee shall release Lessee from its obligations under this Lease with respect to Hazardous Substances, unless specifically so
            agreed by Lessor in writing at the time of such agreement.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e){' '}
            <span className="para-title">Lessor Indemnification.</span>{' '}
            Lessor and its successors and assigns shall indemnify, defend, reimburse and hold Lessee, its
            employees and lenders, harmless from and against any and all environmental damages, including the cost of remediation, which are suffered as a
            direct result of Hazardous Substances on the Premises prior to Lessee taking possession or which are caused by the gross negligence or willful
            misconduct of Lessor, its agents or employees. Lessor&apos;s obligations, as and when required by the Applicable Requirements, shall include, but not be
            limited to, the cost of investigation, removal, remediation, restoration and/or abatement, and shall survive the expiration or termination of this Lease.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (f){' '}
            <span className="para-title">Investigations and Remediations.</span>{' '}
            Lessor shall retain the responsibility and pay for any investigations or remediation
            measures required by governmental entities having jurisdiction with respect to the existence of Hazardous Substances on the Premises prior to the
            Lessee taking possession, unless such remediation measure is required as a result of Lessee&apos;s use (including &quot;Alterations&quot;, as defined in paragraph
            7.3(a) below) of the Premises, in which event Lessee shall be responsible for such payment. Lessee shall cooperate fully in any such activities at the
            request of Lessor, including allowing Lessor and Lessor&apos;s agents to have reasonable access to the Premises at reasonable times in order to carry out
            Lessor&apos;s investigative and remedial responsibilities.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (g){' '}
            <span className="para-title">Lessor Termination Option.</span>{' '}
            If a Hazardous Substance Condition (see Paragraph 9.1(e)) occurs during the term of this Lease,
            unless Lessee is legally responsible therefor (in which case Lessee shall make the investigation and remediation thereof required by the Applicable
            Requirements and this Lease shall continue in full force and effect, but subject to Lessor&apos;s rights under Paragraph 6.2(d) and Paragraph 13), Lessor
            may, at Lessor&apos;s option, either (i) investigate and remediate such Hazardous Substance Condition, if required, as soon as reasonably possible at
            Lessor&apos;s expense, in which event this Lease shall continue in full force and effect, or (ii) if the estimated cost to remediate such condition exceeds 12
            times the then monthly Base Rent or $100,000, whichever is greater, give written notice to Lessee, within 30 days after receipt by Lessor of knowledge
            of the occurrence of such Hazardous Substance Condition, of Lessor&apos;s desire to terminate this Lease as of the date 60 days following the date of such
            notice. In the event Lessor elects to give a termination notice, Lessee may, within 10 days thereafter, give written notice to Lessor of Lessee&apos;s
            commitment to pay the amount by which the cost of the remediation of such Hazardous Substance Condition exceeds an amount equal to 12 times the
            then monthly Base Rent or $100,000, whichever is greater. Lessee shall provide Lessor with said funds or satisfactory assurance thereof within 30
            days following such commitment. In such event, this Lease shall continue in full force and effect, and Lessor shall proceed to make such remediation
            as soon as reasonably possible after the required funds are available. If Lessee does not give such notice and provide the required funds or assurance
            thereof within the time provided, this Lease shall terminate as of the date specified in Lessor&apos;s notice of termination.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>6.3</strong>{' '}
            <span className="para-title">Lessee&apos;s Compliance with Applicable Requirements.</span>{' '}
            Except as otherwise provided in this Lease, Lessee shall, at Lessee&apos;s
            sole expense, fully, diligently and in a timely manner, materially comply with all Applicable Requirements, the requirements of any applicable fire
          </div>

          <PageFooter pageNum={5} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 6 -- 6.3 (cont) through 7.3(b)
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            insurance underwriter or rating bureau, and the recommendations of Lessor&apos;s engineers and/or consultants which relate in any manner to such
            Requirements, without regard to whether said Requirements are now in effect or become effective after the Start Date. Lessee shall, within 10 days
            after receipt of Lessor&apos;s written request, provide Lessor with copies of all permits and other documents, and other information evidencing Lessee&apos;s
            compliance with any Applicable Requirements specified by Lessor, and shall immediately upon receipt, notify Lessor in writing (with copies of any
            documents involved) of any threatened or actual claim, notice, citation, warning, complaint or report pertaining to or involving the failure of Lessee or the
            Premises to comply with any Applicable Requirements. Likewise, Lessee shall immediately give written notice to Lessor of: (i) any water damage to the
            Premises and any suspected seepage, pooling, dampness or other condition conducive to the production of mold; or (ii) any mustiness or other odors
            that might indicate the presence of mold in the Premises.
          </p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>6.4</strong>{' '}
            <span className="para-title">Inspection; Compliance.</span>{' '}
            Lessor and Lessor&apos;s &quot;Lender&quot; (as defined in Paragraph 30) and consultants shall have the right to enter
            into Premises at any time, in the case of an emergency, and otherwise at reasonable times after reasonable notice, for the purpose of inspecting the
            condition of the Premises and for verifying compliance by Lessee with this Lease. The cost of any such inspections shall be paid by Lessor, unless a
            violation of Applicable Requirements, or a Hazardous Substance Condition (see Paragraph 9.1) is found to exist or be imminent, or the inspection is
            requested or ordered by a governmental authority. In such case, Lessee shall upon request reimburse Lessor for the cost of such inspection, so long
            as such inspection is reasonably related to the violation or contamination. In addition, Lessee shall provide copies of all relevant material safety data
            sheets (MSDS) to Lessor within 10 days of the receipt of written request therefor.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>7.</strong>{' '}
            <span className="para-title">Maintenance; Repairs; Utility Installations; Trade Fixtures and Alterations.</span>
          </p>

          <div className="indent para">
            <strong>7.1</strong>{' '}
            <span className="para-title">Lessee&apos;s Obligations.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">In General.</span>{' '}
            Subject to the provisions of Paragraph 2.2 (Condition), 2.3 (Compliance), 6.3 (Lessee&apos;s Compliance with
            Applicable Requirements), 7.2 (Lessor&apos;s Obligations), 9 (Damage or Destruction), and 14 (Condemnation), Lessee shall, at Lessee&apos;s sole expense,
            keep the Premises, Utility Installations (intended for Lessee&apos;s exclusive use, no matter where located), and Alterations in good order, condition and
            repair (whether or not the portion of the Premises requiring repairs, or the means of repairing the same, are reasonably or readily accessible to Lessee,
            and whether or not the need for such repairs occurs as a result of Lessee&apos;s use, any prior use, the elements or the age of such portion of the Premises),
            including, but not limited to, all equipment or facilities, such as plumbing, HVAC equipment, electrical, lighting facilities, boilers, pressure vessels,
            fixtures, interior walls, interior surfaces of exterior walls, ceilings, floors, windows, doors, plate glass, and skylights but excluding any items which are
            the responsibility of Lessor pursuant to Paragraph 7.2. Lessee, in keeping the Premises in good order, condition and repair, shall exercise and perform
            good maintenance practices, specifically including the procurement and maintenance of the service contracts required by Paragraph 7.1(b) below.
            Lessee&apos;s obligations shall include restorations, replacements or renewals when necessary to keep the Premises and all improvements thereon or a part
            thereof in good order, condition and state of repair.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Service Contracts.</span>{' '}
            Lessee shall, at Lessee&apos;s sole expense, procure and maintain contracts, with copies to Lessor, in
            customary form and substance for, and with contractors specializing and experienced in the maintenance of the following improvements, if any, if and when installed on the Premises: (i) HVAC equipment, (ii) boiler and pressure vessels, and (iii) clarifiers. However, Lessor
            reserves the right, upon notice to Lessee, to procure and maintain any or all of such service contracts, and Lessee shall reimburse Lessor, upon
            demand, for the cost thereof.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Failure to Perform.</span>{' '}
            If Lessee fails to perform Lessee&apos;s obligations under this Paragraph 7.1, Lessor may enter upon the
            Premises after 10 days&apos; prior written notice to Lessee (except in the case of an emergency, in which case no notice shall be required), perform such
            obligations on Lessee&apos;s behalf, and put the Premises in good order, condition and repair, and Lessee shall promptly pay to Lessor a sum equal to 115%
            of the cost thereof.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d){' '}
            <span className="para-title">Replacement.</span>{' '}
            Subject to Lessee&apos;s indemnification of Lessor as set forth in Paragraph 8.7 below, and without relieving
            Lessee of liability resulting from Lessee&apos;s failure to exercise and perform good maintenance practices, if an item described in Paragraph 7.1(b) cannot
            be repaired other than at a cost which is in excess of 50% of the cost of replacing such item, then such item shall be replaced by Lessor, and the cost
            thereof shall be prorated between the Parties and Lessee shall only be obligated to pay, each month during the remainder of the term of this Lease, on
            the date on which Base Rent is due, an amount equal to the product of multiplying the cost of such replacement by a fraction, the numerator of which is
            one, and the denominator of which is 144 (ie. 1/144th of the cost per month). Lessee shall pay Interest on the unamortized balance but may prepay its
            obligation at any time.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>7.2</strong>{' '}
            <span className="para-title">Lessor&apos;s Obligations.</span>{' '}
            Subject to the provisions of Paragraphs 2.2 (Condition), 2.3 (Compliance), 6.3 (Lessee&apos;s Compliance with
            Applicable Requirements), 7.2 (Lessor&apos;s Obligations), 9 (Damage or Destruction), and 14 (Condemnation), Lessor, subject to reimbursement pursuant to
            Paragraph 4.2, shall keep in good order, condition and repair the foundations, exterior walls, structural condition of interior bearing walls, exterior roof,
            fire sprinkler system, Common Area fire alarm and/or smoke detection systems, fire hydrants, parking lots, walkways, parkways, driveways,
            landscaping, fences, signs and utility systems serving the Common Areas and all parts thereof, as well as providing the services for which there is a
            Common Area Operating Expense pursuant to Paragraph 4.2. Lessor shall not be obligated to paint the exterior or interior surfaces of exterior walls nor
            shall Lessor be obligated to maintain, repair or replace windows, doors or plate glass of the Premises. Lessee expressly waives the benefit of any
            statute now or hereafter in effect to the extent it is inconsistent with the terms of this Lease.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>7.3</strong>{' '}
            <span className="para-title">Utility Installations; Trade Fixtures; Alterations.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Definitions.</span>{' '}
            The term &quot;Utility Installations&quot; refers to all floor and window coverings, air and/or vacuum lines, power
            panels, electrical distribution, security and fire protection systems, communication cabling, lighting fixtures, HVAC equipment, plumbing, and fencing in
            or on the Premises. The term &quot;Trade Fixtures&quot; shall mean Lessee&apos;s machinery and equipment that can be removed without doing material damage to
            the Premises. The term &quot;Alterations&quot; shall mean any modification of the improvements, other than Utility Installations or Trade Fixtures, whether by
            addition or deletion. &quot;Lessee Owned Alterations and/or Utility Installations&quot; are defined as Alterations and/or Utility Installations made by Lessee
            that are not yet owned by Lessor pursuant to Paragraph 7.4(a).
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Consent.</span>{' '}
            Lessee shall not make any Alterations or Utility Installations to the Premises without Lessor&apos;s prior written
            consent. Lessee may, however, make non-structural Alterations or Utility Installations to the interior of the Premises (excluding the roof) without such
            consent but upon notice to Lessor, as long as they are not visible from the outside, do not involve puncturing, relocating or removing the roof or any
            existing walls, will not affect the electrical, plumbing, HVAC, and/or life safety systems, and the cumulative cost thereof during this Lease as extended
            does not exceed a sum equal to 3 month&apos;s Base Rent in the aggregate or a sum equal to one month&apos;s Base Rent in any one year. Notwithstanding the
            foregoing, Lessee shall not make or permit any roof penetrations and/or install anything on the roof without the prior written approval of Lessor. Lessor
            may, as a precondition to granting such approval, require Lessee to utilize a contractor chosen and/or approved by Lessor. Any Alterations or Utility
            Installations that Lessee shall desire to make and which require the consent of the Lessor shall be presented to Lessor in written form with detailed
            plans. Consent shall be deemed conditioned upon Lessee&apos;s: (i) acquiring all applicable governmental permits, (ii) furnishing Lessor with copies of both
            the permits and the plans and specifications prior to commencement of the work, and (iii) compliance with all conditions of said permits and other
            Applicable Requirements in a prompt and expeditious manner. Any Alterations or Utility Installations shall be performed in a workmanlike manner with
            good and sufficient materials. Lessee shall promptly upon completion furnish Lessor with as-built plans and specifications. For work which costs an
            amount in excess of one month&apos;s Base Rent, Lessor may condition its consent upon Lessee providing a lien and completion bond in an amount equal
          </div>

          <PageFooter pageNum={6} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 7 -- 7.3(b) cont through 8.4
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            to 150% of the estimated cost of such Alteration or Utility Installation and/or upon Lessee&apos;s posting an additional Security Deposit with Lessor.
          </p>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Liens; Bonds.</span>{' '}
            Lessee shall pay, when due, all claims for labor or materials furnished or alleged to have been furnished
            to or for Lessee at or for use on the Premises, which claims are or may be secured by any mechanic&apos;s or materialman&apos;s lien against the Premises or
            any interest therein. Lessee shall give Lessor not less than 10 days notice prior to the commencement of any work in, on or about the Premises, and
            Lessor shall have the right to post notices of non-responsibility. If Lessee shall contest the validity of any such lien, claim or demand, then Lessee
            shall, at its sole expense defend and protect itself, Lessor and the Premises against the same and shall pay and satisfy any such adverse judgment that
            may be rendered thereon before the enforcement thereof. If Lessor shall require, Lessee shall furnish a surety bond in an amount equal to 150% of the
            amount of such contested lien, claim or demand, indemnifying Lessor against liability for the same. If Lessor elects to participate in any such action,
            Lessee shall pay Lessor&apos;s attorneys&apos; fees and costs.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>7.4</strong>{' '}
            <span className="para-title">Ownership; Removal; Surrender; and Restoration.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Ownership.</span>{' '}
            Subject to Lessor&apos;s right to require removal or elect ownership as hereinafter provided, all Alterations and
            Utility Installations made by Lessee shall be the property of Lessee, but considered a part of the Premises. Lessor may, at any time, elect in writing to
            be the owner of all or any specified part of the Lessee Owned Alterations and Utility Installations. Unless otherwise instructed per paragraph 7.4(b)
            hereof, all Lessee Owned Alterations and Utility Installations shall, at the expiration or termination of this Lease, become the property of Lessor and be
            surrendered by Lessee with the Premises.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Removal.</span>{' '}
            By delivery to Lessee of written notice from Lessor not earlier than 90 and not later than 30 days prior to the
            end of the term of this Lease, Lessor may require that any or all Lessee Owned Alterations or Utility Installations be removed by the expiration or
            termination of this Lease. Lessor may require the removal at any time of all or any part of any Lessee Owned Alterations or Utility Installations made
            without the required consent.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Surrender; Restoration.</span>{' '}
            Lessee shall surrender the Premises by the Expiration Date or any earlier termination date,
            and surfaces thereof broom clean and free of debris, and in good operating order, condition and state of repair,
            ordinary wear and tear excepted. &quot;Ordinary wear and tear&quot; shall not include any damage or deterioration that would have been prevented by good
            maintenance practice. Notwithstanding the foregoing, if this Lease is for 12 months or less, then Lessee shall surrender the Premises in the same
            condition as delivered to Lessee on the Start Date with NO allowance for ordinary wear and tear. Lessee shall repair any damage occasioned by the
            installation, maintenance or removal of Trade Fixtures, Lessee owned Alterations and/or Utility Installations, furnishings, and equipment as well as the
            removal of any storage tank installed by or for Lessee. Lessee shall also completely remove from the Premises any and all Hazardous Substances
            brought onto the Premises by or for Lessee, or any third party (except Hazardous Substances which were deposited via underground migration from
            areas outside the Project) even if such removal would require Lessee to perform or pay for work that exceeds statutory requirements. Trade Fixtures
            shall remain the property of Lessee and shall be removed by Lessee. Any personal property of Lessee not removed on or before the Expiration Date or
            any earlier termination date shall be deemed to have been abandoned by Lessee and may be disposed of or retained by Lessor as Lessor may desire.
            The failure by Lessee to timely vacate the Premises pursuant to this Paragraph 7.4(c) without the express written consent of Lessor shall constitute a
            holdover under the provisions of Paragraph 26 below.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>8.</strong>{' '}
            <span className="para-title">Insurance; Indemnity.</span>
          </p>

          <div className="indent para">
            <strong>8.1</strong>{' '}
            <span className="para-title">Payment of Premiums.</span>{' '}
            The cost of the premiums for the insurance policies required to be carried by Lessor, pursuant to
            Paragraphs 8.2(b), 8.3(a) and 8.3(b), shall be a Common Area Operating Expense. Premiums for policy periods commencing prior to, or extending
            beyond, the term of this Lease shall be prorated to coincide with the corresponding Start Date or Expiration Date.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.2</strong>{' '}
            <span className="para-title">Liability Insurance.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Carried by Lessee.</span>{' '}
            Lessee shall obtain and keep in force a Commercial General Liability policy of insurance protecting
            Lessee and Lessor as an additional insured against claims for bodily injury, personal injury and property damage based upon or arising out of the
            ownership, use, occupancy or maintenance of the Premises and all areas appurtenant thereto. Such insurance shall be on an occurrence basis
            providing single limit coverage in an amount not less than $1,000,000 per occurrence with an annual aggregate of not less than $2,000,000. Lessee
            shall add Lessor as an additional insured by means of an endorsement at least as broad as the Insurance Service Organization&apos;s &quot;Additional
            Insured-Managers or Lessors of Premises&quot; Endorsement. The policy shall not contain any intra-insured exclusions as between insured persons or
            organizations, but shall include coverage for liability assumed under this Lease as an &quot;insured contract&quot; for the performance of Lessee&apos;s indemnity
            obligations under this Lease. The limits of said insurance shall not, however, limit the liability of Lessee nor relieve Lessee of any obligation hereunder.
            Lessee shall provide an endorsement on its liability policy(ies) which provides that its insurance shall be primary to and not contributory with any similar
            insurance carried by Lessor, whose insurance shall be considered excess insurance only.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Carried by Lessor.</span>{' '}
            Lessor shall maintain liability insurance as described in Paragraph 8.2(a), in addition to, and not in
            lieu of, the insurance required to be maintained by Lessee. Lessee shall not be named as an additional insured therein.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.3</strong>{' '}
            <span className="para-title">Property Insurance - Building, Improvements and Rental Value.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Building and Improvements.</span>{' '}
            Lessor shall obtain and keep in force a policy or policies of insurance in the name of
            Lessor, with loss payable to Lessor, any ground-lessor, and to any Lender insuring loss or damage to the Premises. The amount of such insurance
            shall be equal to the full insurable replacement cost of the Premises, as the same shall exist from time to time, or the amount required by any Lender,
            but in no event more than the commercially reasonable and available insurable value thereof. Lessee Owned Alterations and Utility Installations, Trade
            Fixtures, and Lessee&apos;s personal property shall be insured by Lessee not by Lessor. If the coverage is available and commercially appropriate, such
            policy or policies shall insure against all risks of direct physical loss or damage (except the perils of flood and/or earthquake unless required by a
            Lender), including coverage for debris removal and the enforcement of any Applicable Requirements requiring the upgrading, demolition, reconstruction
            or replacement of any portion of the Premises as the result of a covered loss. Said policy or policies shall also contain an agreed valuation provision in
            lieu of any coinsurance clause, waiver of subrogation, and inflation guard protection causing an increase in the annual property insurance coverage
            amount by a factor of not less than the adjusted U.S. Department of Labor Consumer Price Index for All Urban Consumers for the city nearest to where
            the Premises are located. If such insurance coverage has a deductible clause, the deductible amount shall not exceed $5,000 per occurrence.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Rental Value.</span>{' '}
            Lessor shall also obtain and keep in force a policy or policies in the name of Lessor with loss payable to
            Lessor and any Lender, insuring the loss of the full Rent for one year with an extended period of indemnity for an additional 180 days (&quot;Rental Value
            insurance&quot;). Said insurance shall contain an agreed valuation provision in lieu of any coinsurance clause, and the amount of coverage shall be
            adjusted annually to reflect the projected Rent otherwise payable by Lessee, for the next 12 month period.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Adjacent Premises.</span>{' '}
            Lessee shall pay for any increase in the premiums for the property insurance of the Building and for
            the Common Areas or other buildings in the Project if said increase is caused by Lessee&apos;s acts, omissions, use or occupancy of the Premises.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d){' '}
            <span className="para-title">Lessee&apos;s Improvements.</span>{' '}
            Since Lessor is the Insuring Party, Lessor shall not be required to insure Lessee Owned
            Alterations and Utility Installations unless the item in question has become the property of Lessor under the terms of this Lease.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.4</strong>{' '}
            <span className="para-title">Lessee&apos;s Property; Business Interruption Insurance; Worker&apos;s Compensation Insurance.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Property Damage.</span>{' '}
            Lessee shall obtain and maintain insurance coverage on all of Lessee&apos;s personal property, Trade
          </div>

          <PageFooter pageNum={7} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 8 -- 8.4(a) cont through 9.2
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            Fixtures, and Lessee Owned Alterations and Utility Installations. Such insurance shall be full replacement cost coverage with a deductible of not to
            exceed $1,000 per occurrence. The proceeds from any such insurance shall be used by Lessee for the replacement of personal property, Trade
            Fixtures and Lessee Owned Alterations and Utility Installations. Lessee shall provide Lessor with written evidence that such insurance is in force.
          </p>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Business Interruption.</span>{' '}
            Lessee shall obtain and maintain loss of income and extra expense insurance in amounts as will
            reimburse Lessee for direct or indirect loss of earnings attributable to all perils commonly insured against by prudent lessees in the business of Lessee
            or attributable to prevention of access to the Premises as a result of such perils.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c){' '}
            <span className="para-title">Worker&apos;s Compensation Insurance.</span>{' '}
            Lessee shall obtain and maintain Worker&apos;s Compensation Insurance in such
            amount as may be required by Applicable Requirements. Such policy shall include a &apos;Waiver of Subrogation&apos; endorsement. Lessee shall provide
            Lessor with a copy of such endorsement along with the certificate of insurance or copy of the policy required by paragraph 8.5.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d){' '}
            <span className="para-title">No Representation of Adequate Coverage.</span>{' '}
            Lessor makes no representation that the limits or forms of coverage of
            insurance specified herein are adequate to cover Lessee&apos;s property, business operations or obligations under this Lease.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.5</strong>{' '}
            <span className="para-title">Insurance Policies.</span>{' '}
            Insurance required herein shall be by companies maintaining during the policy term a &quot;General Policyholders
            Rating&quot; of at least A-, VII, as set forth in the most current issue of &quot;Best&apos;s Insurance Guide&quot;, or such other rating as may be required by a Lender.
            Lessee shall not do or permit to be done anything which invalidates the required insurance policies. Lessee shall, prior to the Start Date, deliver to
            Lessor certified copies of policies of such insurance or certificates with copies of the required endorsements evidencing the existence and amounts of
            the required insurance. No such policy shall be cancelable or subject to modification except after 30 days prior written notice to Lessor. Lessee shall,
            at least 10 days prior to the expiration of such policies, furnish Lessor with evidence of renewals or &quot;insurance binders&quot; evidencing renewal thereof, or
            Lessor may order such insurance and charge the cost thereof to Lessee, which amount shall be payable to Lessor upon demand. Such
            policies shall be for a term of at least one year, or the length of the remaining term of this Lease, whichever is less. If either Party shall fail to procure
            and maintain the insurance required to be carried by it, the other Party may, but shall not be required to, procure and maintain the same.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.6</strong>{' '}
            <span className="para-title">Waiver of Subrogation.</span>{' '}
            Without affecting any other rights or remedies, Lessee and Lessor each hereby release and relieve the
            other, and waive their entire right to recover damages against the other, for loss of or damage to its property arising out of or incident to the perils
            required to be insured against herein. The effect of such releases and waivers is not limited by the amount of insurance carried or required, or by any
            deductibles applicable hereto. The Parties agree to have their respective property damage insurance
            companies may have against Lessor or Lessee, as the case may be, so long as the insurance is not invalidated thereby.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.7</strong>{' '}
            <span className="para-title">Indemnity.</span>{' '}
            Except for Lessor&apos;s gross negligence or willful misconduct, Lessee shall indemnify, protect, defend and hold harmless
            the Premises, Lessor and its agents, Lessor&apos;s master or ground lessor, partners and Lenders, from and against any and all claims, loss of rents and/or
            damages, liens, judgments, penalties, attorneys&apos; and consultants&apos; fees, expenses and/or liabilities arising out of, involving, or in connection with, the use
            and/or occupancy of the Premises by Lessee. If any action or proceeding is brought against Lessor by reason of any of the foregoing matters, Lessee
            shall upon notice defend the same at Lessee&apos;s expense by counsel reasonably satisfactory to Lessor and Lessor shall cooperate with Lessee in such
            defense. Lessor need not have first paid any such claim in order to be defended or indemnified.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.8</strong>{' '}
            <span className="para-title">Exemption of Lessor and its Agents from Liability.</span>{' '}
            Notwithstanding the negligence or breach of this Lease by Lessor or its
            agents, neither Lessor nor its agents shall be liable under any circumstances for: (i) injury or damage to the person or goods, wares, merchandise or
            other property of Lessee, Lessee&apos;s employees, contractors, invitees, customers, or any other person in or about the Premises, whether such damage or
            injury is caused by or results from fire, steam, electricity, gas, water or rain, indoor air quality, the presence of mold or from the breakage, leakage,
            obstruction or other defects of pipes, fire sprinklers, wires, appliances, plumbing, HVAC or lighting fixtures, or from any other cause, whether the said
            injury or damage results from conditions arising upon the Premises or upon other portions of the Building, or from other sources or places, (ii) any
            damages arising from any act or neglect of any other tenant of Lessor or from the failure of Lessor or its agents to enforce the provisions of any other
            lease in the Project, or (iii) injury to Lessee&apos;s business or for any loss of income or profit therefrom. Instead, it is intended that Lessee&apos;s sole recourse in
            the event of such damages or injury be to file a claim on the insurance policy(ies) that Lessee is required to maintain pursuant to the provisions of
            paragraph 8.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>8.9</strong>{' '}
            <span className="para-title">Failure to Provide Insurance.</span>{' '}
            Lessee acknowledges that any failure on its part to obtain or maintain the insurance required
            herein will expose Lessor to risks and potentially cause Lessor to incur costs not contemplated by this Lease, the extent of which will be extremely
            difficult to ascertain. Accordingly, for any month or portion thereof that Lessee does not maintain the required insurance and/or does not provide Lessor
            with the required binders or certificates evidencing the existence of the required insurance, the Base Rent shall be automatically increased, without any
            requirement for notice to Lessee, by an amount equal to 10% of the then existing Base Rent or $100, whichever is greater. The parties agree that such
            increase in Base Rent represents fair and reasonable compensation for the additional risk/costs that Lessor will incur by reason of Lessee&apos;s failure to
            maintain the required insurance. Such increase in Base Rent shall in no event constitute a waiver of Lessee&apos;s Default or Breach with respect to the
            failure to maintain such insurance, prevent the exercise of any of the other rights and remedies granted hereunder, nor relieve Lessee of its obligation to
            maintain the insurance specified in this Lease.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>9.</strong>{' '}
            <span className="para-title">Damage or Destruction.</span>
          </p>

          <div className="indent para">
            <strong>9.1</strong>{' '}
            <span className="para-title">Definitions.</span>
          </div>

          <div className="indent2 para">
            (a) &quot;Premises Partial Damage&quot; shall mean damage or destruction to the improvements on the Premises, other than
            Lessee Owned Alterations and Utility Installations, which can reasonably be repaired in 3 months or less from the date of the damage or destruction,
            and the cost thereof does not exceed a sum equal to 6 month&apos;s Base Rent. Lessor shall notify Lessee in writing within 30 days from the date of the
            damage or destruction as to whether or not the damage is Partial or Total. Notwithstanding the foregoing, Premises Partial Damage shall not include
            damage to windows, doors, and/or other similar items which Lessee has the responsibility to repair or replace pursuant to the provisions of Paragraph
            7.1.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) &quot;Premises Total Destruction&quot; shall mean damage or destruction to the improvements on the Premises, other than
            Lessee Owned Alterations and Utility Installations and Trade Fixtures, which cannot reasonably be repaired in 3 months or less from the date of the
            damage or destruction and/or the cost thereof exceeds a sum equal to 6 month&apos;s Base Rent. Lessor shall notify Lessee in writing within 30 days from
            the date of the damage or destruction as to whether or not the damage is Partial or Total.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) &quot;Insured Loss&quot; shall mean damage or destruction to improvements on the Premises, other than Lessee Owned
            Alterations and Utility Installations and Trade Fixtures, which was caused by an event required to be covered by the insurance described in Paragraph
            8.3(a), irrespective of any deductible amounts or coverage limits involved.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) &quot;Replacement Cost&quot; shall mean the cost to repair or rebuild the improvements owned by Lessor at the time of the
            occurrence to their condition existing immediately prior thereto, including demolition, debris removal and upgrading required by the operation of
            Applicable Requirements, and without deduction for depreciation.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) &quot;Hazardous Substance Condition&quot; shall mean the occurrence or discovery of a condition involving the presence of, or
            a contamination by, a Hazardous Substance, in, on, or under the Premises which requires restoration.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.2</strong>{' '}
            <span className="para-title">Partial Damage - Insured Loss.</span>{' '}
            If a Premises Partial Damage that is an Insured Loss occurs, then Lessor shall, at Lessor&apos;s
            expense, repair such damage (but not Lessee&apos;s Trade Fixtures or Lessee Owned Alterations and Utility Installations) as soon as reasonably possible
          </div>

          <PageFooter pageNum={8} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 9 -- 9.2 cont through 10.3
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            and this Lease shall continue in full force and effect; provided, however, that Lessee shall, at Lessor&apos;s election, make the repair of any damage or
            destruction the total cost to repair of which is $10,000 or less, and, in such event, Lessor shall make any applicable insurance proceeds available to
            Lessee on a reasonable basis for that purpose. Notwithstanding the foregoing, if the required insurance was not in force or the insurance proceeds are
            not sufficient to effect such repair, the Insuring Party shall promptly contribute the shortage in proceeds as and when required to complete said repairs.
            In the event, however, such shortage was due to the fact that, by reason of the unique nature of the improvements, full replacement cost insurance
            coverage was not commercially reasonable and available, Lessor shall have no obligation to pay for the shortage in insurance proceeds or to fully
            restore the unique aspects of the Premises unless Lessor provides Lessor with the funds to cover same, or adequate assurance thereof, within 10 days
            following receipt of written notice of such shortage and request therefor. If Lessor receives said funds or adequate assurance thereof within said 10 day
            period, the party responsible for making the repairs shall complete them as soon as reasonably possible and this Lease shall remain in full force and
            effect. If such funds or assurance are not received, Lessor may nevertheless elect by written notice to Lessee within 10 days thereafter to: (i) make
            such restoration and repair as is commercially reasonable with Lessor paying any shortage in proceeds, in which case this Lease shall remain in full
            force and effect, or (ii) have this Lease terminate 30 days thereafter. Lessee shall not be entitled to reimbursement of any funds contributed by Lessee
            to repair any such damage or destruction. Premises Partial Damage due to flood or earthquake shall be subject to Paragraph 9.3, notwithstanding that
            there may be some insurance coverage, but the net proceeds of any such insurance shall be made available for the repairs if made by either Party.
          </p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.3</strong>{' '}
            <span className="para-title">Partial Damage - Uninsured Loss.</span>{' '}
            If a Premises Partial Damage that is not an Insured Loss occurs, unless caused by a
            negligent or willful act of Lessee (in which event Lessee shall make the repairs at Lessee&apos;s expense), Lessor may either: (i) repair such damage as
            soon as reasonably possible at Lessor&apos;s expense, in which event this Lease shall continue in full force and effect, or (ii) terminate this Lease by giving
            written notice to Lessee within 30 days after receipt by Lessor of knowledge of the occurrence of such damage. Such termination shall be effective 60
            days following the date of such notice. In the event Lessor elects to terminate this Lease, Lessee shall have the right within 10 days after receipt of the
            termination notice to give written notice to Lessor of Lessee&apos;s commitment to pay for the repair of such damage without reimbursement from Lessor.
            Lessee shall provide Lessor with said funds or satisfactory assurance thereof within 30 days after making such commitment. In such event this Lease
            shall continue in full force and effect, and Lessor shall proceed to make such repairs as soon as reasonably possible after the required funds are
            available. If Lessee does not make the required commitment, this Lease shall terminate as of the date specified in the termination notice.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.4</strong>{' '}
            <span className="para-title">Total Destruction.</span>{' '}
            Notwithstanding any other provision hereof, if a Premises Total Destruction occurs, this Lease shall terminate
            60 days following such Destruction. If the damage or destruction was caused by the gross negligence or willful misconduct of Lessee, Lessor shall
            have the right to recover Lessor&apos;s damages from Lessee, except as provided in Paragraph 8.6.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.5</strong>{' '}
            <span className="para-title">Damage Near End of Term.</span>{' '}
            If at any time during the last 6 months of this Lease there is damage for which the cost to repair
            exceeds one month&apos;s Base Rent, whether or not an Insured Loss, Lessor may terminate this Lease effective 60 days following the date of occurrence of
            such damage by giving a written termination notice to Lessee within 30 days after the date of occurrence of such damage. Notwithstanding the
            foregoing, if Lessee at that time has an exercisable option to extend this Lease or to purchase the Premises, then Lessee may preserve this Lease by,
            (a) exercising such option and (b) providing Lessor with any shortage in insurance proceeds (or adequate assurance thereof) needed to make the
            repairs on or before the earlier of (i) the date which is 10 days after Lessee&apos;s receipt of Lessor&apos;s written notice purporting to terminate this Lease, or (ii)
            the day prior to the date upon which such option expires. If Lessee duly exercises such option during such period and provides Lessor with funds (or
            adequate assurance thereof) to cover any shortage in insurance proceeds, Lessor shall, at Lessor&apos;s commercially reasonable expense, repair such
            damage as soon as reasonably possible and this Lease shall continue in full force and effect. If Lessee fails to exercise such option and provide such
            funds or assurance during such period, then this Lease shall terminate on the date specified in the termination notice and Lessee&apos;s option shall be
            extinguished.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.6</strong>{' '}
            <span className="para-title">Abatement of Rent; Lessee&apos;s Remedies.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Abatement.</span>{' '}
            In the event of Premises Partial Damage or Premises Total Destruction or a Hazardous Substance
            Condition for which Lessee is not responsible under this Lease, the Rent payable by Lessee for the period required for the repair, remediation or
            restoration of such damage shall be abated in proportion to the degree to which Lessee&apos;s use of the Premises is impaired, but not to exceed the
            proceeds received from the Rental Value insurance. All other obligations of Lessee hereunder shall be performed by Lessee, and Lessor shall have no
            liability for any such damage, destruction, remediation, repair or restoration except as provided herein.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Remedies.</span>{' '}
            If Lessor is obligated to repair or restore the Premises and does not commence, in a substantial and
            meaningful way, such repair or restoration within 90 days after such obligation shall accrue, Lessee may, at any time prior to the commencement of
            such repair or restoration, give written notice to Lessor and to any Lenders of which Lessee has actual notice, of Lessee&apos;s election to terminate this
            Lease on a date not less than 60 days following the giving of such notice. If Lessee gives such notice and such repair or restoration is not commenced
            within 30 days thereafter, this Lease shall terminate as of the date specified in said notice. If the repair or restoration is commenced within such 30
            days, this Lease shall continue in full force and effect. &quot;Commence&quot; shall mean either the unconditional authorization of the preparation of the required
            plans, or the beginning of the actual work on the Premises, whichever first occurs.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>9.7</strong>{' '}
            <span className="para-title">Termination; Advance Payments.</span>{' '}
            Upon termination of this Lease pursuant to Paragraph 6.2(g) or Paragraph 9, an equitable
            adjustment shall be made concerning advance Base Rent and any other advance payments made by Lessee to Lessor. Lessor shall, in addition, return
            to Lessee so much of Lessee&apos;s Security Deposit as has not been, or is not then required to be, used by Lessor.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>10.</strong>{' '}
            <span className="para-title">Real Property Taxes.</span>
          </p>

          <div className="indent para">
            <strong>10.1</strong>{' '}
            <span className="para-title">Definition.</span>{' '}
            As used herein, the term &quot;Real Property Taxes&quot; shall include any form of assessment; real estate, general, special,
            ordinary or extraordinary, or rental levy or tax (other than inheritance, personal income or estate taxes); improvement bond; and/or license fee imposed
            upon or levied against any legal or equitable interest of Lessor in the Project, Lessor&apos;s right to other income therefrom, and/or Lessor&apos;s business of
            leasing, by any authority having the direct or indirect power to tax and where the funds are generated with reference to the Project address and where
            the proceeds so generated are to be applied by the city, county or other local taxing authority of a jurisdiction within which the Project is located. The
            term &quot;Real Property Taxes&quot; shall also include any tax, fee, levy, assessment or charge, or any increase therein: (i) imposed by reason of events
            occurring during the term of this Lease, including but not limited to, a change in the ownership of the Project, (ii) a change in the improvements thereon,
            and/or (iii) levied or assessed on machinery or equipment provided by Lessor to Lessee pursuant to this Lease. In calculating Real Property Taxes for
            any calendar year, the Real Property Taxes for any real estate tax year shall be included in the calculation of Real Property Taxes for such calendar
            year based upon the number of days which such calendar year and tax year have in common.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>10.2</strong>{' '}
            <span className="para-title">Payment of Taxes.</span>{' '}
            Except as otherwise provided in Paragraph 10.3, Lessor shall pay the Real Property Taxes applicable to the
            Project, and said payments shall be included in the calculation of Common Area Operating Expenses in accordance with the provisions of Paragraph
            4.2.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>10.3</strong>{' '}
            <span className="para-title">Additional Improvements.</span>{' '}
            Common Area Operating Expenses shall not include Real Property Taxes specified in the tax
            assessor&apos;s records and work sheets as being caused by additional improvements placed upon the Project by other lessees or by Lessor for the
            exclusive enjoyment of such other lessees. Notwithstanding Paragraph 10.2 hereof, Lessee shall, however, pay to Lessor at the time Common Area
            Operating Expenses are payable under Paragraph 4.2, the entirety of any increase in Real Property Taxes if assessed solely by reason of Alterations,
            Trade Fixtures or Utility Installations placed upon the Premises by Lessee or at Lessee&apos;s request or by reason of any alterations or improvements to the
          </div>

          <PageFooter pageNum={9} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 10 -- 10.3 cont through 12.3(a)
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            Premises made by Lessor subsequent to the execution of this Lease by the Parties.
          </p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>10.4</strong>{' '}
            <span className="para-title">Joint Assessment.</span>{' '}
            If the Building is not separately assessed, Real Property Taxes allocated to the Building shall be an equitable
            proportion of the Real Property Taxes for all of the land and improvements included within the tax parcel assessed, such proportion to be determined by
            the respective valuations assigned in the assessor&apos;s work sheets or such other information as may be reasonably available. Lessor&apos;s
            reasonable determination thereof, in good faith, shall be conclusive.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>10.5</strong>{' '}
            <span className="para-title">Personal Property Taxes.</span>{' '}
            Lessee shall pay prior to delinquency all taxes assessed against and levied upon Lessee Owned
            Alterations and Utility Installations, Trade Fixtures, furnishings, equipment and all personal property of Lessee contained in the Premises. When
            possible, Lessee shall cause its Lessee Owned Alterations and Utility Installations, Trade Fixtures, furnishings, equipment and all other personal
            property to be assessed and billed separately from the real property of Lessor. If any of Lessee&apos;s said property shall be assessed with Lessor&apos;s real
            property, Lessee shall pay Lessor the taxes attributable to Lessee&apos;s property within 10 days after receipt of a written statement setting forth the taxes
            applicable to Lessee&apos;s property.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>11.</strong>{' '}
            <span className="para-title">Utilities and Services.</span>{' '}
            Lessee shall pay for all water, gas, heat, light, power, telephone, trash disposal and other utilities and services
            supplied to the Premises, together with any taxes thereon. Notwithstanding the provisions of Paragraph 4.2, if at any time in Lessor&apos;s sole judgment,
            Lessor determines that Lessee is using a disproportionate amount of water, electricity or other commonly metered utilities, or that Lessee is generating
            a large volume of trash as to require an increase in the size of the trash receptacle and/or an increase in the number of times per month that it is
            emptied, then Lessor may increase Lessee&apos;s Base Rent by an amount equal to such increased costs. There shall be no abatement of Rent and Lessor
            shall not be liable in any respect whatsoever for the inadequacy, stoppage, interruption or discontinuance of any utility or service due to riot, strike, labor
            dispute, breakdown, accident, repair or other cause beyond Lessor&apos;s reasonable control or in cooperation with governmental request or directions.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>12.</strong>{' '}
            <span className="para-title">Assignment and Subletting.</span>
          </p>

          <div className="indent para">
            <strong>12.1</strong>{' '}
            <span className="para-title">Lessor&apos;s Consent Required.</span>
          </div>

          <div className="indent2 para">
            (a) Lessee shall not voluntarily or by operation of law assign, transfer, mortgage or encumber (collectively, &quot;assign or
            assignment&quot;) or sublet all or any part of Lessee&apos;s interest in this Lease or in the Premises without Lessor&apos;s prior written consent.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) Unless Lessee is a corporation and its stock is publicly traded on a national stock exchange, a change in the control of
            Lessee shall constitute an assignment requiring consent. The transfer, on a cumulative basis, of 25% or more of the voting control of Lessee shall
            constitute a change in control for this purpose.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) The involvement of Lessee or its assets in any transaction, or series of transactions (by way of merger, sale, acquisition,
            financing, transfer, leveraged buy-out or otherwise), whether or not a formal assignment or hypothecation of this Lease or Lessee&apos;s assets occurs,
            which results or will result in a reduction of the Net Worth of Lessee by an amount greater than 25% of such Net Worth as it was represented at the
            time of the execution of this Lease or at the time of the most recent assignment to which Lessor has consented, or as it exists immediately prior to said
            transaction or transactions constituting such reduction, whichever was or is greater, shall be considered an assignment of this Lease to which Lessor
            may withhold its consent. &quot;Net Worth of Lessee&quot; shall mean the net worth of Lessee (excluding any guarantors) established under generally accepted
            accounting principles.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) An assignment or subletting without consent shall, at Lessor&apos;s option, be a Default curable after notice per Paragraph
            13.1(c), or a noncurable Breach without the necessity of any notice and grace period. If Lessor elects to treat such unapproved assignment or
            subletting as a noncurable Breach, Lessor may either: (i) terminate this Lease, or (ii) upon 30 days written notice, increase the monthly Base Rent to
            110% of the Base Rent then in effect. Further, in the event of such Breach and rental adjustment, (i) the purchase price of any option to purchase the
            Premises held by Lessee shall be subject to similar adjustment to 110% of the price previously in effect, and (ii) all fixed and non-fixed rental
            adjustments scheduled during the remainder of the Lease term shall be increased to 110% of the scheduled adjusted rent.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) Lessee&apos;s remedy for any breach of Paragraph 12.1 by Lessor shall be limited to compensatory damages and/or injunctive
            relief.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (f) Lessor may reasonably withhold consent to a proposed assignment or subletting if Lessee is in Default at the time
            consent is requested.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (g) Notwithstanding the foregoing, allowing a de minimis portion of the Premises, ie. 20 square feet or less, to be used by a
            third party vendor in connection with the installation of a vending machine or payphone shall not constitute a subletting.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>12.2</strong>{' '}
            <span className="para-title">Terms and Conditions Applicable to Assignment and Subletting.</span>
          </div>

          <div className="indent2 para">
            (a) Regardless of Lessor&apos;s consent, no assignment or subletting shall: (i) be effective without the express written assumption
            by such assignee or sublessee of the obligations of Lessee under this Lease, (ii) release Lessee of any obligations hereunder, or (iii) alter the primary
            liability of Lessee for the payment of Rent or for the performance of any other obligations to be performed by Lessee.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) Lessor may accept Rent or performance of Lessee&apos;s obligations from any person other than Lessee pending approval or
            disapproval of an assignment. Neither a delay in the approval or disapproval of such assignment nor the acceptance of Rent or performance shall
            constitute a waiver or estoppel of Lessor&apos;s right to exercise its remedies for Lessee&apos;s Default or Breach.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) Lessor&apos;s consent to any assignment or subletting shall not constitute consent to any subsequent assignment or
            subletting.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) In the event of any Default or Breach by Lessee, Lessor may proceed directly against Lessee, any Guarantors or anyone
            else responsible for the performance of Lessee&apos;s obligations under this Lease, including any assignee or sublessee, without first exhausting Lessor&apos;s
            remedies against any other person or entity responsible therefore to Lessor, or any security held by Lessor.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) Each request for consent to an assignment or subletting shall be in writing, accompanied by information relevant to
            Lessor&apos;s determination as to the financial and operational responsibility and appropriateness of the proposed assignee or sublessee, including but not
            limited to the intended use and/or required modification of the Premises, if any, together with a fee of $500 as consideration for Lessor&apos;s considering
            and processing said request. Lessee agrees to provide Lessor with such other or additional information and/or documentation as may be reasonably
            requested. (See also Paragraph 36)
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (f) Any assignee of, or sublessee under, this Lease shall, by reason of accepting such assignment, entering into such
            sublease, or entering into possession of the Premises or any portion thereof, be deemed to have assumed and agreed to conform to and comply with
            each and every term, covenant, condition and obligation herein to be observed or performed by Lessee during the term of said assignment or sublease,
            other than such obligations as are contrary to or inconsistent with provisions of an assignment or sublease to which Lessor has specifically consented
            to in writing.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (g) Lessor&apos;s consent to any assignment or subletting shall not transfer to the assignee or sublessee any Option granted to
            the original Lessee by this Lease unless such transfer is specifically consented to by Lessor in writing. (See Paragraph 39.2)
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>12.3</strong>{' '}
            <span className="para-title">Additional Terms and Conditions Applicable to Subletting.</span>{' '}
            The following terms and conditions shall apply to any subletting by
            Lessee of all or any part of the Premises and shall be deemed included in all subleases under this Lease whether or not expressly incorporated therein:
          </div>
          <div className="indent2 para">
            (a) Lessee hereby assigns and transfers to Lessor all of Lessee&apos;s interest in all Rent payable on any sublease, and Lessor
            may collect such Rent and apply same toward Lessee&apos;s obligations under this Lease; provided, however, that until a Breach shall occur in the
          </div>

          <PageFooter pageNum={10} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 11 -- 12.3(a) cont through 13.2(a)
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            performance of Lessee&apos;s obligations, Lessee may collect said Rent. In the event that the amount collected by Lessor exceeds Lessee&apos;s then
            outstanding obligations any such excess shall be refunded to Lessee. Lessor shall not, by reason of the foregoing or any assignment of such sublease,
            nor by reason of the collection of Rent, be deemed liable to the sublessee for any failure of Lessee to perform and comply with any of Lessee&apos;s
            obligations to such sublessee. Lessee hereby irrevocably authorizes and directs any such sublessee, upon receipt of a written notice from Lessor
            stating that a Breach exists in the performance of Lessee&apos;s obligations under this Lease, to pay to Lessor all Rent due and to become due under the
            sublease. Sublessee shall rely upon any such notice from Lessor and shall pay all Rents to Lessor without any obligation or right to inquire as to
            whether such Breach exists, notwithstanding any claim from Lessee to the contrary.
          </p>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) In the event of a Breach by Lessee, Lessor may, at its option, require sublessee to attorn to Lessor, in which event
            Lessor shall undertake the obligations of the sublessee under such sublease from the time of the exercise of said option to the expiration of
            such sublease; provided, however, Lessor shall not be liable for any prepaid rents or security deposit paid by such sublessee to such sublessor or for any
            prior Defaults or Breaches of such sublessor.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) Any matter requiring the consent of the sublessor under a sublease shall also require the consent of Lessor.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) No sublessee shall further assign or sublet all or any part of the Premises without Lessor&apos;s prior written consent.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) Lessor shall deliver a copy of any notice of Default or Breach by Lessee to the sublessee, who shall have the right to cure
            the Default of Lessee within the grace period, if any, specified in such notice. The sublessee shall have a right of reimbursement and offset from and
            against Lessee for any such Defaults cured by the sublessee.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>13.</strong>{' '}
            <span className="para-title">Default; Breach; Remedies.</span>
          </p>

          <div className="indent para">
            <strong>13.1</strong>{' '}
            <span className="para-title">Default; Breach.</span>{' '}
            A &quot;Default&quot; is defined as a failure by the Lessee to comply with or perform any of the terms, covenants,
            conditions or Rules and Regulations under this Lease. A &quot;Breach&quot; is defined as the occurrence of one or more of the following Defaults, and the
            failure of Lessee to cure such Default within any applicable grace period:
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (a) The abandonment of the Premises; or the vacating of the Premises without providing a commercially reasonable level of
            security, or where the coverage of the property insurance described in Paragraph 8.3 is jeopardized as a result thereof, or without providing reasonable
            assurances to minimize potential vandalism.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) The failure of Lessee to make any payment of Rent or any Security Deposit required to be made by Lessee hereunder,
            whether to Lessor or to a third party, when due, to provide reasonable evidence of insurance or surety bond, or to fulfill any obligation under this Lease
            which endangers or threatens life or property, where such failure continues for a period of 3 business days following written notice to Lessee. THE
            ACCEPTANCE BY LESSOR OF A PARTIAL PAYMENT OF RENT OR SECURITY DEPOSIT SHALL NOT CONSTITUTE A WAIVER OF ANY OF
            LESSOR&apos;S RIGHTS, INCLUDING LESSOR&apos;S RIGHT TO RECOVER POSSESSION OF THE PREMISES.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) The failure of Lessee to allow Lessor and/or its agents access to the Premises or the commission of waste, act or acts
            constituting public or private nuisance, and/or an illegal activity on the Premises by Lessee, where such actions continue for a period of 3 business days
            following written notice to Lessee.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (d) The failure by Lessee to provide (i) reasonable written evidence of compliance with Applicable Requirements, (ii) the
            service contracts, (iii) the rescission of an unauthorized assignment or subletting, (iv) an Estoppel Certificate or financial statements, (v) a requested
            subordination, (vi) evidence concerning any guaranty and/or Guarantor, (vii) any document requested under Paragraph 41, (viii) material safety data
            sheets (MSDS), or (ix) any other documentation or information which Lessor may reasonably require of Lessee under the terms of this Lease, where
            any such failure continues for a period of 10 days following written notice to Lessee.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (e) A Default by Lessee as to the terms, covenants, conditions or provisions of this Lease, or of the rules adopted under
            Paragraph 2.9 hereof, other than those described in subparagraphs 13.1(a), (b), (c) or (d), above, where such Default continues for a period of 30 days
            after written notice; provided, however, that if the nature of Lessee&apos;s Default is such that more than 30 days are reasonably required for its cure, then it
            shall not be deemed to be a Breach if Lessee commences such cure within said 30 day period and thereafter diligently prosecutes such cure to
            completion.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (f) The occurrence of any of the following events: (i) the making of any general arrangement or assignment for the benefit of
            creditors; (ii) becoming a &quot;debtor&quot; as defined in 11 U.S.C. &sect; 101 or any successor statute thereto (unless, in the case of a petition filed against
            Lessee, the same is dismissed within 60 days); (iii) the appointment of a trustee or receiver to take possession of substantially all of Lessee&apos;s assets
            located at the Premises or of Lessee&apos;s interest in this Lease, where possession is not restored to Lessee within 30 days; or (iv) the attachment,
            execution or other judicial seizure of substantially all of Lessee&apos;s assets located at the Premises or of Lessee&apos;s interest in this Lease, where such
            seizure is not discharged within 30 days; provided, however, in the event that any provision of this subparagraph is contrary to any applicable law, such
            provision shall be of no force or effect, and not affect the validity of the remaining provisions.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (g) The discovery that any financial statement of Lessee or of any Guarantor given to Lessor was materially false.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (h) If the performance of Lessee&apos;s obligations under this Lease is guaranteed: (i) the death of a Guarantor, (ii) the
            termination of a Guarantor&apos;s liability with respect to this Lease other than in accordance with the terms of such guaranty, (iii) a Guarantor&apos;s becoming
            insolvent or the subject of a bankruptcy filing, (iv) a Guarantor&apos;s refusal to honor the guaranty, or (v) a Guarantor&apos;s breach of its guaranty obligation on
            an anticipatory basis, and Lessee&apos;s failure, within 60 days following written notice of any such event, to provide written alternative assurance or security,
            which, when coupled with the then existing resources of Lessee, equals or exceeds the combined financial resources of Lessee and the Guarantors
            that existed at the time of execution of this Lease.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>13.2</strong>{' '}
            <span className="para-title">Remedies.</span>{' '}
            If Lessee fails to perform any of its affirmative duties or obligations, within 10 days after written notice (or in case of an
            emergency, without notice), Lessor may, at its option, perform such duty or obligation on Lessee&apos;s behalf, including but not limited to the obtaining of
            reasonably required bonds, insurance policies, or governmental licenses, permits or approvals. Lessee shall pay to Lessor an amount equal to 115% of
            the costs and expenses incurred by Lessor in such performance upon receipt of an invoice therefor. In the event of a Breach, Lessor may, with or
            without further notice or demand, and without limiting Lessor in the exercise of any right or remedy which Lessor may have by reason of such Breach:
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (a) Terminate Lessee&apos;s right to possession of the Premises by any lawful means, in which case this Lease shall terminate
            and Lessee shall immediately surrender possession to Lessor. In such event Lessor shall be entitled to recover from Lessee: (i) the unpaid Rent which
            had been earned at the time of termination; (ii) the worth at the time of award of the amount by which the unpaid rent which would have been earned
            after termination until the time of award exceeds the amount of such rental loss that the Lessee proves could have been reasonably avoided; (iii) the
            worth at the time of award of the amount by which the unpaid rent for the balance of the term after the time of award exceeds the amount of such rental
            loss that the Lessee proves could be reasonably avoided; and (iv) any other amount necessary to compensate Lessor for all the detriment proximately
            caused by the Lessee&apos;s failure to perform its obligations under this Lease or which in the ordinary course of things would be likely to result therefrom,
            including but not limited to the cost of recovering possession of the Premises, expenses of reletting, including necessary renovation and alteration of
            the Premises, reasonable attorneys&apos; fees, and that portion of any leasing commission paid by Lessor in connection with this Lease applicable to the
            unexpired term of this Lease. The worth at the time of award of the amount referred to in provision (iii) of the immediately preceding sentence shall be
            computed by discounting such amount at the discount rate of the Federal Reserve Bank of the District within which the Premises are located at the time
            of award plus one percent. Efforts by Lessor to mitigate damages caused by Lessee&apos;s Breach of this Lease shall not waive Lessor&apos;s right to recover
          </div>

          <PageFooter pageNum={11} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 12 -- 13.2(a) cont through 15.2
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            any damages to which Lessor is otherwise entitled. If termination of this Lease is obtained through the provisional remedy of unlawful detainer, Lessor
            shall have the right to recover in such proceeding any unpaid Rent and damages as are recoverable therein, or Lessor may reserve the right to recover
            all or any part thereof in a separate suit. If a notice and grace period required under Paragraph 13.1 was not previously given, a notice to pay rent or
            quit, or to perform or quit given to Lessee under the unlawful detainer statute shall also constitute the notice required by Paragraph 13.1. In such case,
            the applicable grace period required by Paragraph 13.1 and the unlawful detainer statute shall run concurrently, and the failure of Lessee to cure the
            Default within the greater of the two such grace periods shall constitute both an unlawful detainer and a Breach of this Lease entitling Lessor to the
            remedies provided for in this Lease and/or by said statute.
          </p>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) Continue the Lease and Lessee&apos;s right to possession and recover the Rent as it becomes due, in which event Lessee
            may sublet or assign, subject only to reasonable limitations. Acts of maintenance, efforts to relet, and/or the appointment of a receiver to protect the
            Lessor&apos;s interests, shall not constitute a termination of the Lessee&apos;s right to possession.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) Pursue any other remedy now or hereafter available under the laws or judicial decisions of the state wherein the
            Premises are located. The expiration or termination of this Lease and/or the termination of Lessee&apos;s right to possession shall not relieve Lessee from
            liability under any indemnity provisions of this Lease as to matters occurring or accruing during the term hereof or by reason of Lessee&apos;s occupancy of
            the Premises.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>13.3</strong>{' '}
            <span className="para-title">Inducement Recapture.</span>{' '}
            Any agreement for free or abated rent or other charges, or for the giving or paying by Lessor to or for
            Lessee of any cash or other bonus, inducement or consideration for Lessee&apos;s entering into this Lease, all of which concessions are hereinafter referred
            to as &quot;Inducement Provisions&quot;, shall be deemed conditioned upon Lessee&apos;s full and faithful performance of all of the terms, covenants and conditions
            of this Lease. Upon Breach of this Lease by Lessee, any such Inducement Provision shall automatically be deemed deleted from this Lease and of no
            further force or effect, and any rent, charge, bonus, inducement or consideration theretofore abated, given or paid by Lessor under such an
            Inducement Provision shall be immediately due and payable by Lessee to Lessor, notwithstanding any subsequent cure of said Breach by Lessee. The
            acceptance by Lessor of rent or the cure of the Breach which initiated the operation of this paragraph shall not be deemed a waiver of Lessor of the
            provisions of this paragraph unless specifically so stated in writing by Lessor at the time of such acceptance.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>13.4</strong>{' '}
            <span className="para-title">Late Charges.</span>{' '}
            Lessee hereby acknowledges that late payment by Lessee of Rent will cause Lessor to incur costs not
            contemplated by this Lease, the exact amount of which will be extremely difficult to ascertain. Such costs include, but are not limited to, processing and
            accounting charges, and late charges which may be imposed upon Lessor by any Lender. Accordingly, if any Rent shall not be received by Lessor
            within 5 days after such amount shall be due, then, without any requirement for notice to Lessee, Lessee shall immediately pay to Lessor a one-time
            late charge equal to 10% of each such overdue amount or $100, whichever is greater. The parties hereby agree that such late charge represents a fair
            and reasonable estimate of the costs Lessor will incur by reason of such late payment. Acceptance of such late charge by Lessor shall in no event
            constitute a waiver of Lessee&apos;s Default or Breach with respect to such overdue amount, nor prevent the exercise of any of the other rights and remedies
            granted hereunder. In the event that a late charge is payable hereunder, whether or not collected, for 3 consecutive installments of Base Rent, then
            notwithstanding any provision of this Lease to the contrary, Base Rent shall, at Lessor&apos;s option, become due and payable quarterly in advance.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>13.5</strong>{' '}
            <span className="para-title">Interest.</span>{' '}
            Any monetary payment due Lessor hereunder, other than late charges, not received by Lessor, when due as to
            scheduled payments (such as Base Rent) or within 30 days following the date on which it was due for non-scheduled payment, shall bear interest from
            the date when due, as to scheduled payments, or the 31st day after it was due as to non-scheduled payments. The interest (&quot;Interest&quot;) charged shall
            be computed at the rate of 10% per annum but shall not exceed the maximum rate allowed by law. Interest is payable in addition to the potential late
            charge provided for in Paragraph 13.4.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>13.6</strong>{' '}
            <span className="para-title">Breach by Lessor.</span>
          </div>

          <div className="indent2 para">
            (a){' '}
            <span className="para-title">Notice of Breach.</span>{' '}
            Lessor shall not be deemed in breach of this Lease unless Lessor fails within a reasonable time to
            perform an obligation required to be performed by Lessor. For purposes of this Paragraph, a reasonable time shall in no event be less than 30 days
            after receipt by Lessor, and any Lender whose name and address shall have been furnished Lessee in writing for such purpose, of written notice
            specifying wherein Lessor has not been performed; provided, however, that if the nature of Lessor&apos;s obligation is such that more than
            30 days are reasonably required for its performance, then Lessor shall not be in breach if performance is commenced within such 30 day period and
            thereafter diligently pursued to completion.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b){' '}
            <span className="para-title">Performance by Lessee on Behalf of Lessor.</span>{' '}
            In the event that neither Lessor nor Lender cures said breach within 30
            days after receipt of said notice, or if having commenced said cure they do not diligently pursue it to completion, then Lessee may elect to cure said
            breach at Lessee&apos;s expense and offset from Rent the actual and reasonable cost to perform such cure, provided however, that such offset shall not
            exceed an amount equal to the greater of one month&apos;s Base Rent or the Security Deposit, reserving Lessee&apos;s right to reimbursement from Lessor for
            any such expense in excess of such offset. Lessee shall document the cost of said cure and supply said documentation to Lessor.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>14.</strong>{' '}
            <span className="para-title">Condemnation.</span>{' '}
            If the Premises or any portion thereof are taken under the power of eminent domain or sold under the threat of the exercise
            of said power (collectively &quot;Condemnation&quot;), this Lease shall terminate as to the part taken as of the date the condemning authority takes title or
            possession, whichever first occurs. If more than 10% of the floor area of the Unit, or more than 25% of the parking spaces is taken by Condemnation,
            Lessee may, at Lessee&apos;s option, to be exercised in writing within 10 days after Lessor shall have given Lessee written notice of such taking (or in the
            absence of such notice, within 10 days after the condemning authority shall have taken possession) terminate this Lease in accordance with the foregoing,
            authority takes such possession. If Lessee does not terminate this Lease in accordance with the foregoing, this Lease shall remain in full force and
            effect as to the portion of the Premises remaining, except that the Base Rent shall be reduced in proportion to the reduction in utility of the Premises
            caused by such Condemnation. Condemnation awards and/or payments shall be the property of Lessor, whether such award shall be made as
            compensation for diminution in value of the leasehold, the value of the part taken, or for severance damages; provided, however, that Lessee shall be
            entitled to any compensation paid by the condemnor for Lessee&apos;s relocation expenses, loss of business goodwill and/or Trade Fixtures, without regard
            to whether or not this Lease is terminated pursuant to the provisions of this Paragraph. All Alterations and Utility Installations made to the Premises by
            Lessee, for purposes of Condemnation only, shall be considered the property of the Lessee and Lessee shall be entitled to any and all compensation
            which is payable therefor. In the event that this Lease is not terminated by reason of the Condemnation, Lessor shall repair any damage to the
            Premises caused by such Condemnation.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>15.</strong>{' '}
            <span className="para-title">Brokerage Fees.</span>
          </p>

          <div className="indent para">
            <strong>15.1</strong>{' '}
            <span className="para-title">Additional Commission.</span>{' '}
            If a separate brokerage fee agreement is attached then in addition to the payments owed pursuant to
            Paragraph 1.10 above, and unless Lessor and the Brokers otherwise agree in writing, Lessor agrees that: (a) if Lessee exercises any Option, (b) if
            Lessee or anyone affiliated with Lessee acquires from Lessor any rights to the Premises or other premises owned by Lessor and located within the
            Project, (c) if Lessee remains in possession of the Premises, with the consent of Lessor, after the expiration of this Lease, or (d) if Base Rent is
            increased, whether by agreement or operation of an escalation clause herein, then, Lessor shall pay Brokers a fee in accordance with the schedule
            attached to such brokerage fee agreement.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>15.2</strong>{' '}
            <span className="para-title">Assumption of Obligations.</span>{' '}
            Any buyer or transferee of Lessor&apos;s interest in this Lease shall be deemed to have assumed Lessor&apos;s
            obligation hereunder. Brokers shall be third party beneficiaries of the provisions of Paragraphs 1.10, 15, 22 and 31. If Lessor fails to pay to Brokers
            any amounts due as and for brokerage fees pertaining to this Lease when due, then such amounts shall accrue Interest. In addition, if Lessor fails to
          </div>

          <PageFooter pageNum={12} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 13 -- 15.2 cont through 24(a)
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            pay any amounts to Lessee&apos;s Broker when due, Lessee&apos;s Broker may send written notice to Lessor and Lessee of such failure and if Lessor fails to pay
            such amounts within 10 days after said notice, Lessee shall pay said monies to its Broker and offset such amounts against Rent. In addition, Lessee&apos;s
            Broker shall be deemed to be a third party beneficiary of any commission agreement entered into by and/or between Lessor and Lessor&apos;s Broker for the
            limited purpose of collecting any brokerage fee owed.
          </p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>15.3</strong>{' '}
            <span className="para-title">Representations and Indemnities of Broker Relationships.</span>{' '}
            Lessee and Lessor each represent and warrant to the other that it
            has had no dealings with any person, firm, broker or finder (other than the Brokers, if any) in connection with this Lease, and that no one other than said
            named Brokers is entitled to any commission or finder&apos;s fee in connection herewith. Lessee and Lessor do each hereby agree to indemnify, protect,
            defend and hold the other harmless from and against liability for compensation or charges which may be claimed by any such unnamed broker, finder
            or other similar party by reason of any dealings or actions of the indemnifying Party, including any costs, expenses, attorneys&apos; fees reasonably incurred
            with respect thereto.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>16.</strong>{' '}
            <span className="para-title">Estoppel Certificates.</span>
          </p>

          <div className="indent2 para">
            (a) Each Party (as &quot;Responding Party&quot;) shall within 10 days after written notice from the other Party (the &quot;Requesting
            Party&quot;) execute, acknowledge and deliver to the Requesting Party a statement in writing in form similar to the then most current &quot;Estoppel Certificate&quot;
            form published by the AIR Commercial Real Estate Association, plus such additional information, confirmation and/or statements as may be reasonably
            requested by the Requesting Party.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) If the Responding Party shall fail to execute or deliver the Estoppel Certificate within such 10 day period, the Requesting
            Party may execute an Estoppel Certificate stating that: (i) the Lease is in full force and effect without modification except as may be represented by the
            Requesting Party, (ii) there are no uncured defaults in the Requesting Party&apos;s performance, and (iii) if Lessor is the Requesting Party, not more than one
            month&apos;s rent has been paid in advance. Prospective purchasers and encumbrancers may rely upon the Requesting Party&apos;s Estoppel Certificate, and the
            Responding Party shall be estopped from denying the truth of the facts contained in said Certificate. In addition, Lessee acknowledges that any failure
            on its part to provide such an Estoppel Certificate will expose Lessor to risks and potentially cause Lessor to incur costs not contemplated by this
            Lease, the extent of which will be extremely difficult to ascertain. Accordingly, should the Lessee fail to execute and/or deliver a requested Estoppel
            Certificate in a timely fashion the monthly Base Rent shall be automatically increased, without any requirement for notice to Lessee, by an amount
            equal to 10% of the then existing Base Rent or $100, whichever is greater. The Parties agree that such increase in Base
            Rent represents fair and reasonable compensation for the additional risk/costs that Lessor will incur by reason of Lessee&apos;s failure to provide the
            Estoppel Certificate. Such increase in Base Rent shall in no event constitute a waiver of Lessee&apos;s Default or Breach with respect to the failure to
            provide the Estoppel Certificate nor prevent the exercise of any of the other rights and remedies granted hereunder.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) If Lessor desires to finance, refinance, or sell the Premises, or any part thereof, Lessee and all Guarantors shall within 10
            days after written notice from Lessor deliver to any potential lender or purchaser designated by Lessor such financial statements as may be reasonably
            required by such lender or purchaser, including but not limited to Lessee&apos;s financial statements for the past 3 years. All such financial statements shall
            be received by Lessor and such lender or purchaser in confidence and shall be used only for the purposes herein set forth.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>17.</strong>{' '}
            <span className="para-title">Definition of Lessor.</span>{' '}
            The term &quot;Lessor&quot; as used herein shall mean the owner or owners at the time in question of the fee title to the
            Premises, or, if this is a sublease, of the Lessee&apos;s interest in the prior lease. In the event of a transfer of Lessor&apos;s title or interest in the Premises or this
            Lease, Lessor shall deliver to the transferee or assignee (in cash or by credit) any unused Security Deposit held by Lessor. Upon such transfer or
            assignment and delivery of the Security Deposit, as aforesaid, the prior Lessor shall be relieved of all liability with respect to the obligations and/or
            covenants under this Lease thereafter to be performed by the Lessor. Subject to the foregoing, the obligations and/or covenants in this Lease to be
            performed by the Lessor shall be binding only upon the Lessor as hereinabove defined.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>18.</strong>{' '}
            <span className="para-title">Severability.</span>{' '}
            The invalidity of any provision of this Lease, as determined by a court of competent jurisdiction, shall in no way affect the
            validity of any other provision hereof.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>19.</strong>{' '}
            <span className="para-title">Days.</span>{' '}
            Unless otherwise specifically indicated to the contrary, the word &quot;days&quot; as used in this Lease shall mean and refer to calendar days.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>20.</strong>{' '}
            <span className="para-title">Limitation on Liability.</span>{' '}
            The obligations of Lessor under this Lease shall not constitute personal obligations of Lessor, or its partners,
            members, directors, officers or shareholders, and Lessee shall look to the Premises, and to no other assets of Lessor, for the satisfaction of any liability
            of Lessor with respect to this Lease, and shall not seek recourse against Lessor&apos;s partners, members, directors, officers or shareholders, or any of their
            personal assets for such satisfaction.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>21.</strong>{' '}
            <span className="para-title">Time of Essence.</span>{' '}
            Time is of the essence with respect to the performance of all obligations to be performed or observed by the Parties under
            this Lease.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>22.</strong>{' '}
            <span className="para-title">No Prior or Other Agreements; Broker Disclaimer.</span>{' '}
            This Lease contains all agreements between the Parties with respect to any matter
            mentioned herein, and no other prior or contemporaneous agreement or understanding shall be effective. Lessor and Lessee each represents and
            warrants to the Brokers that it has made, and is relying solely upon, its own investigation as to the nature, quality, character and financial responsibility
            of the other Party to this Lease and as to the use, nature, quality and character of the Premises. Brokers have no responsibility with respect to
            any default or breach hereof by either Party.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>23.</strong>{' '}
            <span className="para-title">Notices.</span>
          </p>

          <div className="indent para">
            <strong>23.1</strong>{' '}
            <span className="para-title">Notice Requirements.</span>{' '}
            All notices required or permitted by this Lease or applicable law shall be in writing and may be delivered in
            person (by hand or by courier) or may be sent by regular, certified or registered mail or U.S. Postal Service Express Mail, with postage prepaid, or by
            facsimile transmission, and shall be deemed sufficiently given if served in a manner specified in this Paragraph 23. The addresses noted adjacent to a
            Party&apos;s signature on this Lease shall be that Party&apos;s address for delivery or mailing of notices. Either Party may by written notice to the other specify a
            different address for notice, except that upon Lessee&apos;s taking possession of the Premises, the Premises shall constitute Lessee&apos;s address for notice. A
            copy of all notices to Lessor shall be concurrently transmitted to such party or parties at such addresses as Lessor may from time to time hereafter
            designate in writing.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>23.2</strong>{' '}
            <span className="para-title">Date of Notice.</span>{' '}
            Any notice sent by registered or certified mail, return receipt requested, shall be deemed given on the date of delivery
            shown on the receipt card, or if no delivery date is shown, the postmark thereon. If sent by regular mail the notice shall be deemed given 72 hours after
            the same is addressed as required herein and mailed with postage prepaid. Notices delivered by United States Express Mail or overnight courier that
            guarantees next day delivery shall be deemed given 24 hours after delivery of the same to the Postal Service or courier. Notices transmitted by
            facsimile transmission or similar means shall be deemed delivered upon telephone confirmation of receipt (confirmation report from fax machine is
            sufficient), provided a copy is also delivered via delivery or mail. If notice is received on a Saturday, Sunday or legal holiday, it shall be deemed
            received on the next business day.
          </div>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>24.</strong>{' '}
            <span className="para-title">Waivers.</span>
          </p>

          <div className="indent2 para">
            (a) No waiver by Lessor of the Default or Breach of any term, covenant or condition hereof by Lessee, shall be deemed a waiver of any
            other term, covenant or condition hereof, or of any subsequent Default or Breach by Lessee of the same or of any other term, covenant or condition
            hereof. Lessor&apos;s consent to, or approval of, any act shall not be deemed to render unnecessary the obtaining of Lessor&apos;s consent to, or approval of, any
            subsequent or similar act by Lessee, or be construed as the basis of an estoppel to enforce the provision or provisions of this Lease requiring such
          </div>

          <PageFooter pageNum={13} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 14 -- 24(a) cont through 30.3
            ================================================================ */}
        <div className="air-page">
          <p className="para">consent.</p>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) The acceptance of Rent by Lessor shall not be a waiver of any Default or Breach by Lessee. Any payment by Lessee may be
            accepted by Lessor on account of moneys or damages due Lessor, notwithstanding any qualifying statements or conditions made by Lessee in
            connection therewith, which such statements and/or conditions shall be of no force or effect whatsoever unless specifically agreed to in writing by
            Lessor at or before the time of deposit of such payment.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) THE PARTIES AGREE THAT THE TERMS OF THIS LEASE SHALL GOVERN WITH REGARD TO ALL MATTERS RELATED
            THERETO AND HEREBY WAIVE THE PROVISIONS OF ANY PRESENT OR FUTURE STATUTE TO THE EXTENT THAT SUCH STATUTE IS
            INCONSISTENT WITH THIS LEASE.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>25.</strong>{' '}
            <span className="para-title">Disclosures Regarding The Nature of a Real Estate Agency Relationship.</span>
          </p>

          <div className="indent2 para">
            (a) When entering into a discussion with a real estate agent regarding a real estate transaction, a Lessor or Lessee should
            outset understand what type of agency relationship or representation it has with the agent or agents in the transaction. Lessor and Lessee
            acknowledge being advised by the Brokers in this transaction as follows:
          </div>

          <div className="indent3 para" style={{ marginTop: 4 }}>
            (i) <em>Lessor&apos;s Agent.</em> A Lessor&apos;s agent under a listing agreement with the Lessor acts as the agent for the Lessor only. A
            Lessor&apos;s agent or subagent has the following affirmative obligations: To the Lessor: A fiduciary duty of utmost care, integrity, honesty, and loyalty in
            dealings with the Lessor. To the Lessor and the Lessee: (a) Diligent exercise of reasonable skills and care in performance of the agent&apos;s duties. (b) A
            duty of honest and fair dealing and good faith. (c) A duty to disclose all facts known to the agent materially affecting the value or desirability of the
            property that are not known to, or within the diligent attention and observation of, the Parties. An agent is not obligated to reveal to either Party any
            confidential information obtained from the other Party which does not involve the affirmative duties set forth above.
          </div>

          <div className="indent3 para" style={{ marginTop: 4 }}>
            (ii) <em>Lessee&apos;s Agent.</em> An agent can agree to act as agent for the Lessee only. In these situations, the agent is not the
            Lessor&apos;s agent, even if by agreement the agent may receive compensation for services rendered, either in full or in part from the Lessor. An agent
            acting only for a Lessee has the following affirmative obligations. To the Lessee: A fiduciary duty of utmost care, integrity, honesty, and loyalty in
            dealings with the Lessee. To the Lessee and the Lessor: (a) Diligent exercise of reasonable skills and care in performance of the agent&apos;s duties. (b) A
            duty of honest and fair dealing and good faith. (c) A duty to disclose all facts known to the agent materially affecting the value or desirability of the
            property that are not known to, or within the diligent attention and observation of, the Parties. An agent is not obligated to reveal to either Party any
            confidential information obtained from the other Party which does not involve the affirmative duties set forth above.
          </div>

          <div className="indent3 para" style={{ marginTop: 4 }}>
            (iii) <em>Agent Representing Both Lessor and Lessee.</em> A real estate agent, either acting directly or through one or more associate
            licenses, can legally be the agent of both the Lessor and the Lessee in a transaction, but only with the knowledge and consent of both the Lessor and
            the Lessee. In a dual agency situation, the agent has the following affirmative obligations to both the Lessor and the Lessee: (a) A fiduciary duty of
            utmost care, integrity, honesty and loyalty in the dealings with either Lessor or the Lessee. (b) Other duties to the Lessor and the Lessee as stated
            above in subparagraphs (i) or (ii). In representing both Lessor and Lessee, the agent may not without the express permission of the respective Party,
            disclose to the other Party that the Lessor will accept rent in an amount less than that indicated in the listing or that the Lessee is willing to pay a higher
            rent than that offered. The above duties of the agent in a real estate transaction do not relieve a Lessor or Lessee from the responsibility to protect their
            own interests. Lessor and Lessee should carefully read all agreements to assure that they adequately express their understanding of the transaction.
            A real estate agent is a person qualified to advise about real estate. If legal or tax advice is desired, consult a competent professional.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) Brokers have no responsibility with respect to any Default or Breach hereof by either Party. The Parties agree that no lawsuit or
            other legal proceeding involving any breach of duty, error or omission relating to this Lease may be brought against Broker more than one year after the
            Start Date and that the liability (including court costs and attorneys&apos; fees), of any Broker with respect to any such lawsuit and/or legal proceeding shall
            not exceed the fee received by such Broker pursuant to this Lease; provided, however, that the foregoing limitation on each Broker&apos;s liability shall not be
            applicable to any gross negligence or willful misconduct of such Broker.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) Lessor and Lessee agree to identify to Brokers as &quot;Confidential&quot; any communication or information given Brokers that is considered
            by such Party to be confidential.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>26.</strong>{' '}
            <span className="para-title">No Right To Holdover.</span>{' '}
            Lessee has no right to retain possession of the Premises or any part thereof beyond the expiration or termination of
            this Lease. In the event that Lessee holds over, then the Base Rent shall be increased to 150% of the Base Rent applicable immediately preceding the
            expiration or termination. Nothing contained herein shall be construed as consent by Lessor to any holding over by Lessee.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>27.</strong>{' '}
            <span className="para-title">Cumulative Remedies.</span>{' '}
            No remedy or election hereunder shall be deemed exclusive but shall, wherever possible, be cumulative with all
            other remedies at law or in equity.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>28.</strong>{' '}
            <span className="para-title">Covenants and Conditions; Construction of Agreement.</span>{' '}
            All provisions of this Lease to be observed or performed by Lessee are both
            covenants and conditions. In construing this Lease, all headings and titles are for the convenience of the Parties only and shall not be considered a
            part of this Lease. Whenever required by the context, the singular shall include the plural and vice versa. This Lease shall be construed as if
            prepared by one of the Parties, but rather according to its fair meaning as a whole, as if both Parties had prepared it.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>29.</strong>{' '}
            <span className="para-title">Binding Effect; Choice of Law.</span>{' '}
            This Lease shall be binding upon the parties, their personal representatives, successors and assigns and
            be governed by the laws of the State in which the Premises are located. Any litigation between the Parties hereto concerning this Lease shall be
            initiated in the county in which the Premises are located.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>30.</strong>{' '}
            <span className="para-title">Subordination; Attornment; Non-Disturbance.</span>
          </p>

          <div className="indent para">
            <strong>30.1</strong>{' '}
            <span className="para-title">Subordination.</span>{' '}
            This Lease and any Option granted hereby shall be subject and subordinate to any ground lease, mortgage, deed
            of trust, or other hypothecation or security device (collectively, &quot;Security Device&quot;), now or hereafter placed upon the Premises, to any and all advances
            made on the security thereof, and to all renewals, modifications, and extensions thereof. Lessee agrees that the holders of any such Security Devices
            (in this Lease together referred to as &quot;Lender&quot;) shall have no liability or obligation to perform any of the obligations of Lessor under this Lease. Any
            Lender may elect to have this Lease and/or any Option granted hereby superior to the lien of its Security Device by giving written notice thereof to
            Lessee, whereupon this Lease and such Options shall be deemed prior to such Security Device, notwithstanding the relative dates of the
            documentation or recordation thereof.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>30.2</strong>{' '}
            <span className="para-title">Attornment.</span>{' '}
            In the event that Lessor transfers title to the Premises, or the Premises are acquired by another upon the foreclosure
            or termination of a Security Devise to which this Lease is subordinated (i) Lessee shall, subject to the non-disturbance provisions of Paragraph 30.3,
            attorn to such new owner, and upon request, enter into a new lease, containing all of the terms and provisions of this Lease, with such new owner for
            the remainder of the term hereof, or, at the election of the new owner, this Lease will automatically become a new lease between Lessee and such new
            owner, and (ii) Lessor shall thereafter be relieved of any further obligations hereunder and such new owner shall assume all of Lessor&apos;s obligations,
            except that such new owner shall not: (a) be liable for any act or omission of any prior lessor or with respect to events occurring prior to acquisition of
            ownership; (b) be subject to any offsets or defenses which Lessee might have against any prior lessor, (c) be bound by prepayment of more than one
            month&apos;s rent, or (d) be liable for the return of any security deposit paid to any prior lessor which was not paid or credited to such new owner.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>30.3</strong>{' '}
            <span className="para-title">Non-Disturbance.</span>{' '}
            With respect to Security Devices entered into by Lessor after the execution of this Lease, Lessee&apos;s
            subordination of this Lease shall be subject to receiving a commercially reasonable non-disturbance agreement (a &quot;Non-Disturbance Agreement&quot;)
            from the Lender which Non-Disturbance Agreement provides that Lessee&apos;s possession of the Premises, and this Lease, including any options to extend
          </div>

          <PageFooter pageNum={14} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 15 -- 30.3 cont through 39.4(c)
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            the term hereof, will not be disturbed so long as Lessee is not in Breach hereof and attorns to the record owner of the Premises. Further, within 60
            days after the execution of this Lease, Lessor shall, if requested by Lessee, use its commercially reasonable efforts to obtain a Non-Disturbance
            Agreement from the holder of any pre-existing Security Device which is secured by the Premises. In the event that Lessor is unable to provide the
            Non-Disturbance Agreement within said 60 days, then Lessee may, at Lessee&apos;s option, directly contact Lender and attempt to negotiate for the
            execution and delivery of a Non-Disturbance Agreement.
          </p>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>30.4</strong>{' '}
            <span className="para-title">Self-Executing.</span>{' '}
            The agreements contained in this Paragraph 30 shall be effective without the execution of any further documents;
            provided, however, that upon written request from Lessor or a Lender in connection with a sale, financing or refinancing of the Premises, Lessee and
            Lessor shall execute such further writings as may be reasonably required to separately document any subordination, attornment and/or
            Non-Disturbance Agreement provided for herein.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>31.</strong>{' '}
            <span className="para-title">Attorneys&apos; Fees.</span>{' '}
            If any Party or Broker brings an action or proceeding involving the Premises whether founded in tort, contract or equity, or
            to declare rights hereunder, the Prevailing Party (as hereafter defined) in any such proceeding, action, or appeal thereon, shall be entitled to reasonable
            attorneys&apos; fees. Such fees may be awarded in the same suit or recovered in a separate suit, whether or not such action or proceeding is pursued to
            decision or judgment. The term, &quot;Prevailing Party&quot; shall include, without limitation, a Party or Broker who substantially obtains or defeats the relief
            sought, as the case may be, whether by compromise, settlement, judgment, or the abandonment by the other Party or Broker of its claim or defense.
            The attorneys&apos; fees award shall not be computed in accordance with any court fee schedule, but shall be such as to fully reimburse all attorneys&apos; fees
            reasonably incurred. In addition, Lessor shall be entitled to attorneys&apos; fees, costs and expenses incurred in the preparation and service of notices
            of Default and consultations in connection therewith, whether or not a legal action is subsequently commenced in connection with such Default or
            Breach ($200 is a reasonable minimum per occurrence for such services and consultation).
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>32.</strong>{' '}
            <span className="para-title">Lessor&apos;s Access; Showing Premises; Repairs.</span>{' '}
            Lessor and Lessor&apos;s agents shall have the right to enter the Premises at any time, in
            the case of an emergency, and otherwise at reasonable times after reasonable prior notice to prospective
            purchasers, lenders, or tenants, and making such alterations, repairs, improvements or additions to the Premises as Lessor may deem necessary or
            desirable and the erecting, using and maintaining of utilities, services, pipes and conduits through the Premises and/or other premises as long as there
            is no material adverse effect on Lessee&apos;s use of the Premises. All such activities shall be without abatement of rent or liability to Lessee.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>33.</strong>{' '}
            <span className="para-title">Auctions.</span>{' '}
            Lessee shall not conduct, nor permit to be conducted, any auction upon the Premises without Lessor&apos;s prior written consent.
            Lessor shall not be obligated to exercise any standard of reasonableness in determining whether to permit an auction.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>34.</strong>{' '}
            <span className="para-title">Signs.</span>{' '}
            Lessor may place on the Premises ordinary &quot;For Sale&quot; signs at any time and ordinary &quot;For Lease&quot; signs during the last 6 months of
            the term hereof. Except for ordinary &quot;For Sublease&quot; signs which may be placed only on the Premises, Lessee shall not place any sign upon the Project
            without Lessor&apos;s prior written consent. All signs must comply with all Applicable Requirements.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>35.</strong>{' '}
            <span className="para-title">Termination; Merger.</span>{' '}
            Unless specifically stated otherwise in writing by Lessor, the voluntary or other surrender of this Lease by Lessee, the
            mutual termination or cancellation hereof, or a termination hereof by Lessor for Breach by Lessee, shall automatically terminate any sublease or lesser
            estate in the Premises; provided, however, that Lessor may elect to continue any one or all existing sublease or lesser interest, shall constitute the Lessor&apos;s election to have
            such event constitute the termination of such interest.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>36.</strong>{' '}
            <span className="para-title">Consents.</span>{' '}
            Except as otherwise provided herein, wherever in this Lease the consent of a Party is required to an act by or for the other Party,
            such consent shall not be unreasonably withheld or delayed. Lessor&apos;s actual reasonable costs and expenses (including but not limited to architects&apos;,
            attorneys&apos;, engineers&apos; and other consultants&apos; fees) incurred in the consideration of, or response to, a request by Lessee for any Lessor consent,
            including but not limited to consents to an assignment, a subletting or the presence or use of a Hazardous Substance, shall be paid by Lessee upon
            receipt of an invoice and supporting documentation therefor. Lessor&apos;s consent to any act, assignment or subletting shall not constitute an
            acknowledgment that no Default or Breach exists, nor shall such consent be deemed a waiver of any then existing Default or
            Breach, except as may be otherwise specifically stated in writing by Lessor at the time of such consent. The failure to specify herein any particular
            condition to Lessor&apos;s consent shall not preclude the imposition by Lessor at the time of consent of such further or other conditions as are then
            reasonable with reference to the particular matter for which consent is being given. In the event that either Party disagrees with any determination,
            made by the other hereunder and reasonably requests the reasons for such determination, the determining party shall furnish its reasons in writing and
            in reasonable detail within 10 business days following such request.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>37.</strong>{' '}
            <span className="para-title">Guarantor.</span>
          </p>

          <div className="indent para">
            <strong>37.1</strong>{' '}
            <span className="para-title">Execution.</span>{' '}
            The Guarantors, if any, shall each execute a guaranty in the form most recently published by the AIR Commercial Real
            Estate Association.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>37.2</strong>{' '}
            <span className="para-title">Default.</span>{' '}
            It shall constitute a Default of the Lessee if any Guarantor fails or refuses, upon request to provide: (a) evidence of the
            execution of the guaranty, including the authority of the party signing on Guarantor&apos;s behalf to obligate Guarantor, and in the case of a corporate
            Guarantor, a certified copy of a resolution of its board of directors authorizing the making of such guaranty, (b) current financial statements, (c) an
            Estoppel Certificate, or (d) written confirmation that the guaranty is still in effect.
          </div>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>38.</strong>{' '}
            <span className="para-title">Quiet Possession.</span>{' '}
            Subject to payment by Lessee of the Rent and performance of all of the covenants, conditions and provisions on
            Lessee&apos;s part to be observed and performed under this Lease, Lessee shall have quiet possession and quiet enjoyment of the Premises during the term
            hereof.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>39.</strong>{' '}
            <span className="para-title">Options.</span>{' '}
            If Lessee is granted an option, as defined below, then the following provisions shall apply.
          </p>

          <div className="indent para">
            <strong>39.1</strong>{' '}
            <span className="para-title">Definition.</span>{' '}
            &quot;Option&quot; shall mean: (a) the right to extend or reduce the term of or renew this Lease or to extend or reduce the term
            of or renew any lease that Lessee has on other property of Lessor; (b) the right of first refusal or first offer to lease either the Premises or other property
            of Lessor; (c) the right to purchase, the right of first offer to purchase or the right of first refusal to purchase the Premises or other property of Lessor.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>39.2</strong>{' '}
            <span className="para-title">Options Personal To Original Lessee.</span>{' '}
            Any Option granted to Lessee in this Lease is personal to the original Lessee, and cannot
            be assigned or exercised by anyone other than said original Lessee and only while the original Lessee is in full possession of the Premises and, if
            requested by Lessor, with Lessee certifying that Lessee has no intention of thereafter assigning or subletting.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>39.3</strong>{' '}
            <span className="para-title">Multiple Options.</span>{' '}
            In the event that Lessee has any multiple Options to extend or renew this Lease, a later Option cannot be
            exercised unless the prior Options have been validly exercised.
          </div>

          <div className="indent para" style={{ marginTop: 4 }}>
            <strong>39.4</strong>{' '}
            <span className="para-title">Effect of Default on Options.</span>
          </div>

          <div className="indent2 para">
            (a) Lessee shall have no right to exercise an Option: (i) during the period commencing with the giving of any notice of
            Default and continuing until said Default is cured, (ii) during the period of time any Rent is unpaid (without regard to whether notice thereof is given
            Lessee), (iii) during the time Lessee is in Breach of this Lease, or (iv) in the event that Lessee has been given 3 or more notices of separate Default,
            whether or not the Defaults are cured, during the 12 month period immediately preceding the exercise of the Option.
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) The period of time within which an Option may be exercised shall not be extended or enlarged by reason of Lessee&apos;s
            inability to exercise an Option because of the provisions of Paragraph 39.4(a).
          </div>

          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) An Option shall terminate and be of no further force or effect, notwithstanding Lessee&apos;s due and timely exercise of the
            Option, if, after such exercise and prior to the commencement of the extended term or completion of the purchase, (i) Lessee fails to pay Rent for a
          </div>

          <PageFooter pageNum={15} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 16 -- 39.4(c) cont through signatures
            ================================================================ */}
        <div className="air-page">
          <p className="para">
            period of 30 days after such Rent becomes due (without any necessity of Lessor to give notice thereof), or (ii) if Lessee commits a Breach of this Lease.
          </p>

          <p className="para" style={{ marginTop: 6 }}>
            <strong>40.</strong>{' '}
            <span className="para-title">Security Measures.</span>{' '}
            Lessee hereby acknowledges that the Rent payable to Lessor hereunder does not include the cost of guard service or
            other security measures, and that Lessor shall have no obligation whatsoever to provide same. Lessee assumes all responsibility for the protection of
            the Premises, Lessee, its agents and invitees and their property from the acts of third parties.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>41.</strong>{' '}
            <span className="para-title">Reservations.</span>{' '}
            Lessor reserves the right: (i) to grant, without the consent or joinder of Lessee, such easements, rights and dedications that
            Lessor deems necessary, (ii) to cause the recordation of parcel maps and restrictions, and (iii) to create and/or install new utility raceways, so long as
            such easements, rights, dedications, maps, restrictions, and utility raceways do not unreasonably interfere with the use of the Premises by Lessee.
            Lessee agrees to sign any documents reasonably requested by Lessor to effectuate such rights.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>42.</strong>{' '}
            <span className="para-title">Performance Under Protest.</span>{' '}
            If at any time a dispute shall arise as to any amount or sum of money to be paid by one Party to the
            other under the provisions hereof, the Party against whom the obligation to pay the money is asserted shall have the right to make payment &quot;under
            protest&quot; and such payment shall not be regarded as a voluntary payment and there shall survive the right on the part of said Party to institute suit for
            recovery of such sum. If it shall be adjudged that there was no legal obligation on the part of said Party to pay such sum or any part thereof, said Party
            shall be entitled to recover such sum or so much thereof as it was not legally required to pay. A Party who does not initiate suit for the recovery of
            sums paid &quot;under protest&quot; within 6 months shall be deemed to have waived its right to protest such payment.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>43.</strong>{' '}
            <span className="para-title">Authority; Multiple Parties; Execution.</span>
          </p>

          <div className="indent2 para">
            (a) If either Party hereto is a corporation, trust, limited liability company, partnership, or similar entity, each
            individual executing this Lease on behalf of such entity represents and warrants that he or she is duly authorized to execute and deliver this Lease on its
            behalf. Each Party shall, within 30 days after request, deliver to the other Party satisfactory evidence of such authority.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (b) If this Lease is executed by more than one person or entity as &quot;Lessee&quot;, each such person or entity shall be
            jointly and severally liable hereunder. It is agreed that any one of the named Lessees shall be empowered to execute any amendment to this Lease, or
            other document ancillary thereto and bind all of the named Lessees, and Lessor may rely on the same as if all of the named Lessees had executed
            such document.
          </div>
          <div className="indent2 para" style={{ marginTop: 4 }}>
            (c) This Lease may be executed by the Parties in counterparts, each of which shall be deemed an original and all
            of which together shall constitute one and the same instrument.
          </div>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>44.</strong>{' '}
            <span className="para-title">Conflict.</span>{' '}
            Any conflict between the printed provisions of this Lease and the typewritten or handwritten provisions shall be controlled by the
            typewritten or handwritten provisions.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>45.</strong>{' '}
            <span className="para-title">Offer.</span>{' '}
            Preparation of this Lease by either party or their agent and submission of same to the other Party shall not be deemed an offer to
            lease to the other Party. This Lease is not intended to be binding until executed and delivered by all Parties hereto.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>46.</strong>{' '}
            <span className="para-title">Amendments.</span>{' '}
            This Lease may be modified only in writing, signed by the Parties in interest at the time of the modification. As long as they
            do not materially change Lessee&apos;s obligations hereunder, Lessee agrees to make such reasonable non-monetary modifications to this Lease as may be
            reasonably required by a Lender in connection with the obtaining of normal financing or refinancing of the Premises.
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>47.</strong>{' '}
            <span className="para-title">Waiver of Jury Trial.</span>{' '}
            <strong>THE PARTIES HEREBY WAIVE THEIR RESPECTIVE RIGHTS TO TRIAL BY JURY IN ANY ACTION OR
            PROCEEDING INVOLVING THE PROPERTY OR ARISING OUT OF THIS AGREEMENT.</strong>
          </p>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>48.</strong>{' '}
            <span className="para-title">Arbitration of Disputes.</span>{' '}
            An Addendum requiring the Arbitration of all disputes between the Parties and/or Brokers arising out of this Lease
          </p>
          <div className="indent para">
            <CB checked={false} /> is <CB checked={true} /> is not attached to this Lease.
          </div>

          <p className="para" style={{ marginTop: 4 }}>
            <strong>49.</strong>{' '}
            <span className="para-title">Americans with Disabilities Act.</span>{' '}
            Since compliance with the Americans with Disabilities Act (ADA) is dependent upon Lessee&apos;s specific use
            of the Premises, Lessor makes no warranty or representation as to whether or not the Premises comply with ADA or any similar legislation. In the
            event that Lessee&apos;s use of the Premises requires modifications or additions to the Premises in order to be in ADA compliance, Lessee agrees to make
            any such necessary modifications and/or additions at Lessee&apos;s expense.
          </p>

          {/* Bold disclaimer block */}
          <div style={{ marginTop: 16, border: '1px solid #000', padding: '8px 12px', fontSize: '9pt', lineHeight: 1.4 }}>
            <p style={{ margin: 0 }}>
              <strong>LESSOR AND LESSEE HAVE CAREFULLY READ AND REVIEWED THIS LEASE AND EACH TERM AND PROVISION CONTAINED HEREIN, AND
              BY THE EXECUTION OF THIS LEASE SHOW THEIR INFORMED AND VOLUNTARY CONSENT THERETO. THE PARTIES HEREBY AGREE
              THAT, AT THE TIME THIS LEASE IS EXECUTED, THE TERMS OF THIS LEASE ARE COMMERCIALLY REASONABLE AND EFFECTUATE THE
              INTENT AND PURPOSE OF LESSOR AND LESSEE WITH RESPECT TO THE PREMISES.</strong>
            </p>
            <p style={{ margin: '4pt 0 0 0' }}>
              <strong>ATTENTION: NO REPRESENTATION OR RECOMMENDATION IS MADE BY THE AIR COMMERCIAL REAL ESTATE ASSOCIATION OR BY ANY
              BROKER AS TO THE LEGAL SUFFICIENCY, LEGAL EFFECT, OR TAX CONSEQUENCES OF THIS LEASE OR THE TRANSACTION TO WHICH
              IT RELATES. THE PARTIES ARE URGED TO:</strong>
            </p>
            <p style={{ margin: '2pt 0 0 0' }}>
              <strong>1. SEEK ADVICE OF COUNSEL AS TO THE LEGAL AND TAX CONSEQUENCES OF THIS LEASE.</strong>
            </p>
            <p style={{ margin: '2pt 0 0 0' }}>
              <strong>2. RETAIN APPROPRIATE CONSULTANTS TO REVIEW AND INVESTIGATE THE CONDITION OF THE PREMISES. SAID
              INVESTIGATION SHOULD INCLUDE BUT NOT BE LIMITED TO: THE POSSIBLE PRESENCE OF HAZARDOUS SUBSTANCES, THE ZONING OF
              THE PREMISES, THE STRUCTURAL INTEGRITY, THE CONDITION OF THE ROOF AND OPERATING SYSTEMS, COMPLIANCE WITH THE
              AMERICANS WITH DISABILITIES ACT AND THE SUITABILITY OF THE PREMISES FOR LESSEE&apos;S INTENDED USE.</strong>
            </p>
            <p style={{ margin: '2pt 0 0 0' }}>
              <strong>WARNING: IF THE PREMISES ARE LOCATED IN A STATE OTHER THAN CALIFORNIA, CERTAIN PROVISIONS OF THIS LEASE MAY NEED TO
              BE REVISED TO COMPLY WITH THE LAWS OF THE STATE IN WHICH THE PREMISES ARE LOCATED.</strong>
            </p>
          </div>

          {/* Signature blocks */}
          <div style={{ marginTop: 16 }}>
            <p className="para">
              The parties hereto have executed this Lease at the place and on the dates specified above their respective signatures.
            </p>

            <div style={{ display: 'flex', gap: 40, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0 }}>Executed at: ________________________</p>
                <p style={{ margin: '4pt 0' }}>On: ________________________</p>
                <p style={{ margin: '4pt 0' }}>By <strong>LESSOR:</strong></p>
                <p style={{ margin: '4pt 0' }}><Fill width="240px">{lease.lessor_name}</Fill></p>
                <p style={{ margin: '8pt 0 0 0' }}>By: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Name Printed: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Title: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Address: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Telephone: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Facsimile: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Email: ________________________</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0 }}>Executed at: ________________________</p>
                <p style={{ margin: '4pt 0' }}>On: ________________________</p>
                <p style={{ margin: '4pt 0' }}>By <strong>LESSEE:</strong></p>
                <p style={{ margin: '4pt 0' }}><Fill width="240px">{lease.lessee_name}</Fill></p>
                <p style={{ margin: '8pt 0 0 0' }}>By: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Name Printed: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Title: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Address: <Fill width="200px">{premisesAddress}</Fill></p>
                <p style={{ margin: '4pt 0' }}>Telephone: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Facsimile: ________________________</p>
                <p style={{ margin: '4pt 0' }}>Email: ________________________</p>
              </div>
            </div>
          </div>

          <PageFooter pageNum={16} totalPages={totalPages} />
          <CopyrightFooter />
        </div>

        {/* ================================================================
            PAGE 17 -- Broker info + copyright
            ================================================================ */}
        <div className="air-page">
          {/* Broker blocks */}
          <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4pt 0' }}><strong>BROKER:</strong></p>
              <p style={{ margin: '2pt 0' }}><Fill width="280px">{lease.lessors_broker_company || lease.lessors_broker_name || '___'}</Fill></p>
              <p style={{ margin: '6pt 0 2pt 0' }}>Attn: <Fill>{lease.lessors_broker_name || '___'}</Fill></p>
              <p style={{ margin: '2pt 0' }}>Title: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Address: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Telephone: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Facsimile: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Email: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Federal ID No. ________________________</p>
              <p style={{ margin: '2pt 0' }}>Broker/Agent DRE License #: ________________________</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4pt 0' }}><strong>BROKER:</strong></p>
              <p style={{ margin: '2pt 0' }}><Fill width="280px">{lease.lessees_broker_company || lease.lessees_broker_name || '___'}</Fill></p>
              <p style={{ margin: '6pt 0 2pt 0' }}>Attn: <Fill>{lease.lessees_broker_name || '___'}</Fill></p>
              <p style={{ margin: '2pt 0' }}>Title: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Address: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Telephone: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Facsimile: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Email: ________________________</p>
              <p style={{ margin: '2pt 0' }}>Federal ID No. ________________________</p>
              <p style={{ margin: '2pt 0' }}>Broker/Agent DRE License #: ________________________</p>
            </div>
          </div>

          {/* NOTICE block */}
          <div style={{ marginTop: 48, fontSize: '9pt', lineHeight: 1.4 }}>
            <p style={{ margin: 0 }}>
              <strong>NOTICE:</strong> These forms are often modified to meet changing requirements of law and industry needs. Always write or call to make sure you
              are utilizing the current form: AIR Commercial Real Estate Association, 800 W 6th Street, Suite 800, Los Angeles, CA 90017. Telephone
              No. (213) 687-8777. Fax No.: (213) 687-8616.
            </p>
            <p style={{ margin: '8pt 0 0 0', textAlign: 'center', fontWeight: 'bold' }}>
              &copy;Copyright 1999 By AIR Commercial Real Estate Association.
            </p>
            <p style={{ margin: '2pt 0 0 0', textAlign: 'center', fontSize: '8pt' }}>
              All rights reserved. No part of these works may be reproduced in any form without permission in writing.
            </p>
          </div>

          <PageFooter pageNum={17} totalPages={totalPages} />
          <CopyrightFooter />
        </div>
      </div>
    </>
  );
}
