import type { CommissionInvoice } from '@/types/database';
import type { InvoiceWithDetail } from '@/lib/queries/invoices';

/**
 * CommissionInvoice enriched with display fields derived from the
 * related lease, property, unit, and broker contact.
 *
 * Used by both the detail page and the print page so they share
 * the same shape.
 */
export interface EnrichedInvoice extends CommissionInvoice {
  /** Full street address of the leased property */
  property_address: string;
  /** Suite / unit number (e.g. "Suite A") */
  suite_number: string;
  /** Broker display name (e.g. "Rocket Glass, CCIM") */
  broker_name: string;
  /** Brokerage company name (e.g. "Rocket Realty") */
  broker_company: string;
  /** DRE or other license number (e.g. "DRE #01234567") */
  broker_license: string;
}

/**
 * Enrich a raw InvoiceWithDetail with display-only fields derived from joins.
 * Shared between the detail page and print page.
 */
export function enrichInvoice(data: InvoiceWithDetail): EnrichedInvoice {
  const lease = data.lease;

  const propertyAddress =
    lease?.property?.address ?? lease?.premises_address ?? '';

  const suiteNumber = lease?.unit?.suite_number
    ? `Suite ${lease.unit.suite_number}`
    : '';

  const brokerContact = lease?.broker;
  const brokerName = brokerContact
    ? [brokerContact.first_name, brokerContact.last_name]
        .filter(Boolean)
        .join(' ') || brokerContact.company_name || 'Rocket Glass, CCIM'
    : 'Rocket Glass, CCIM';

  const brokerCompany = brokerContact?.company_name ?? 'Rocket Realty';

  // TODO: Store broker license in contacts table; placeholder until client provides real DRE #
  const brokerLicense = 'DRE #01234567';

  return {
    ...data,
    property_address: propertyAddress,
    suite_number: suiteNumber,
    broker_name: brokerName,
    broker_company: brokerCompany,
    broker_license: brokerLicense,
  };
}
