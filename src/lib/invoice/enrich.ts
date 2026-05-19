import type { CommissionInvoice } from '@/types/database';
import type { InvoiceWithDetail, RentEscalationRow } from '@/lib/queries/invoices';
import { BROKER_CONFIG } from '@/lib/config/broker';

export interface EnrichedInvoice extends CommissionInvoice {
  property_address: string;
  premises_full: string;
  suite_number: string;
  // suite_sf inherited from CommissionInvoice (number | null).
  lessor_name: string;
  lessee_name: string;
  broker_name: string;
  broker_company: string;
  broker_license: string;
  escalations: RentEscalationRow[];
}

export function enrichInvoice(data: InvoiceWithDetail): EnrichedInvoice {
  const lease = data.lease;

  // Property + suite resolve from (in order): linked lease → invoice's own fields.
  const propertyAddress =
    lease?.property?.address
    ?? lease?.premises_address
    ?? data.property_address
    ?? '';

  const suiteFromLease = lease?.unit?.suite_number
    ? `Suite ${lease.unit.suite_number}`
    : '';
  const suiteNumber = suiteFromLease || (data.suite_number ?? '');

  const premisesParts = [propertyAddress];
  if (suiteNumber) premisesParts[0] += ` ${suiteNumber.replace('Suite ', '#')}`;
  const cityState = [
    lease?.premises_city ?? lease?.property?.city,
    lease?.premises_state ?? lease?.property?.state,
  ].filter(Boolean).join(', ');
  if (cityState) premisesParts.push(cityState);
  if (lease?.premises_zip) premisesParts.push(lease.premises_zip);
  const premisesFull = premisesParts.join(', ');

  const brokerContact = lease?.broker;
  const brokerName = brokerContact
    ? [brokerContact.first_name, brokerContact.last_name]
        .filter(Boolean)
        .join(' ') || brokerContact.company_name || BROKER_CONFIG.displayName
    : BROKER_CONFIG.displayName;

  const brokerCompany = brokerContact?.company_name ?? BROKER_CONFIG.companyName;
  const brokerLicense = BROKER_CONFIG.dreLicense;

  const escalations = (lease?.escalations ?? []).sort(
    (a, b) => a.year_number - b.year_number,
  );

  return {
    ...data,
    property_address: propertyAddress,
    premises_full: premisesFull,
    suite_number: suiteNumber,
    lessor_name: lease?.lessor_name ?? data.payee_name ?? '',
    lessee_name: lease?.lessee_name ?? data.lessee_name ?? '',
    broker_name: brokerName,
    broker_company: brokerCompany,
    broker_license: brokerLicense,
    escalations,
  };
}
