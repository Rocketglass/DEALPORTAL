/**
 * Broker business details — used in invoices, PDFs, print views, and email templates.
 */

export const BROKER_CONFIG = {
  /** Legal business name */
  companyName: 'Rocket Glass, Inc.',

  /** Display name with credentials */
  displayName: 'Rocket Glass, CCIM',

  /** Office address */
  address: {
    street: '2950 Clairemont Dr',
    city: 'San Diego',
    state: 'CA',
    zip: '92117',
  },

  /** DRE license number */
  dreLicense: 'DRE #01527512',

  /** Primary broker contact phone (shown on flyers). */
  phone: '(858) 344-9916',

  /** Primary broker contact email. */
  email: 'rocketglass4@hotmail.com',

  /** Payment instructions for invoices — check preferred, wire accepted, ACH not accepted. */
  paymentInstructions: (invoiceNumber: string) =>
    `Please make check payable to:\nRocket Glass, Inc.\n2950 Clairemont Dr\nSan Diego, CA 92117\n\nOr wire to:\nBank: Chase Bank\nRouting: 322271627\nAccount: 629837375\nRef: ${invoiceNumber}\n\nNote: ACH payments are not accepted.`,

  /** Full formatted address */
  get fullAddress() {
    return `${this.address.street}\n${this.address.city}, ${this.address.state} ${this.address.zip}`;
  },

  /** One-line address */
  get addressLine() {
    return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zip}`;
  },
} as const;
