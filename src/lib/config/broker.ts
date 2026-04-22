/**
 * Broker business details — used in invoices, PDFs, print views, and email templates.
 *
 * These should be updated with Rocket's real information before production use.
 * TODO: Move to env vars or a settings table once Rocket provides real values.
 */

export const BROKER_CONFIG = {
  /** Legal business name */
  companyName: 'Rocket Glass, Inc.',

  /** Display name with credentials */
  displayName: 'Rocket Glass, CCIM',

  /** Office address */
  address: {
    street: '1234 Commercial Blvd, Suite 200',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
  },

  /** DRE license number */
  dreLicense: 'DRE #01234567',

  /** Primary broker contact phone (shown on flyers). */
  phone: '(858) 344-9916',

  /** Primary broker contact email. */
  email: 'rocketglass4@hotmail.com',

  /** Payment instructions for invoices */
  paymentInstructions: (invoiceNumber: string) =>
    `Please make check payable to:\nRocket Glass, Inc.\n1234 Commercial Blvd, Suite 200\nSan Diego, CA 92101\n\nOr wire to:\nBank: First Republic Bank\nRouting: XXXXXXXXX\nAccount: XXXXXXXXX\nRef: ${invoiceNumber}`,

  /** Full formatted address */
  get fullAddress() {
    return `${this.address.street}\n${this.address.city}, ${this.address.state} ${this.address.zip}`;
  },

  /** One-line address */
  get addressLine() {
    return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zip}`;
  },
} as const;
