import type { CommissionInvoice } from '@/types/database';

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
