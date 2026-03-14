/**
 * Generates a professional multi-page lease PDF that mirrors the
 * AIR Standard Industrial/Commercial Multi-Tenant Lease — NET form layout.
 *
 * Uses pdf-lib to create the document from scratch with all sections (1.1–1.12)
 * plus the rent escalation schedule.
 */

import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  PDFFont,
  rgb,
  PageSizes,
} from 'pdf-lib';
import type { LeaseWithRelations, RentEscalation } from '@/types/database';

// ============================================================
// Constants
// ============================================================

const PAGE_WIDTH = PageSizes.Letter[0]; // 612
const PAGE_HEIGHT = PageSizes.Letter[1]; // 792
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_GRAY = rgb(0.2, 0.2, 0.2);
const COLOR_GRAY = rgb(0.45, 0.45, 0.45);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_HEADER_BG = rgb(0.12, 0.12, 0.2);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SECTION_BG = rgb(0.95, 0.95, 0.97);

// ============================================================
// Helpers
// ============================================================

function fmtCurrency(amount: number | null | undefined): string {
  if (amount == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function fmtDate(date: string | null | undefined): string {
  if (!date) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return '--';
  return new Intl.NumberFormat('en-US').format(n);
}

/**
 * Wraps text to fit within maxWidth, returning an array of lines.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ============================================================
// PDF Builder class
// ============================================================

class LeasePdfBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private y = 0;

  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private fontItalic!: PDFFont;

  private lease: LeaseWithRelations;
  private escalations: RentEscalation[];

  constructor(lease: LeaseWithRelations, escalations: RentEscalation[]) {
    this.lease = lease;
    this.escalations = escalations;
  }

  async build(): Promise<Uint8Array> {
    this.doc = await PDFDocument.create();

    // pdf-lib standard fonts (close to Times New Roman)
    this.fontRegular = await this.doc.embedFont(StandardFonts.TimesRoman);
    this.fontBold = await this.doc.embedFont(StandardFonts.TimesRomanBold);
    this.fontItalic = await this.doc.embedFont(StandardFonts.TimesRomanItalic);

    this.doc.setTitle('Standard Industrial/Commercial Multi-Tenant Lease - NET');
    this.doc.setAuthor('Rocket Realty Portal');
    this.doc.setSubject(`Lease: ${this.lease.lessee_name} — ${this.lease.premises_address}`);

    this.addPage();
    this.drawHeader();
    this.drawSection11();
    this.drawSection12();
    this.drawSection12b();
    this.drawSection13();
    this.drawSection14();
    this.drawSection15();
    this.drawSection16();
    this.drawSection17();
    this.drawSection18();
    this.drawSection19();
    this.drawSection110();
    this.drawSection111();
    this.drawSection112();

    if (this.escalations.length > 0) {
      this.drawEscalationSchedule();
    }

    this.drawFooterOnAllPages();

    return this.doc.save();
  }

  // ----------------------------------------------------------
  // Page management
  // ----------------------------------------------------------

  private addPage(): void {
    this.page = this.doc.addPage(PageSizes.Letter);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  private ensureSpace(needed: number): void {
    if (this.y - needed < MARGIN_BOTTOM) {
      this.addPage();
    }
  }

  // ----------------------------------------------------------
  // Drawing primitives
  // ----------------------------------------------------------

  private drawText(
    text: string,
    {
      x = MARGIN_LEFT,
      font,
      size = 10,
      color = COLOR_BLACK,
      maxWidth = CONTENT_WIDTH,
    }: {
      x?: number;
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {},
  ): void {
    const useFont = font ?? this.fontRegular;
    const lines = wrapText(text, useFont, size, maxWidth);
    const lineHeight = size * 1.4;

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x,
        y: this.y,
        size,
        font: useFont,
        color,
      });
      this.y -= lineHeight;
    }
  }

  private drawField(label: string, value: string, indent = 0): void {
    const labelWidth = this.fontBold.widthOfTextAtSize(label + ':  ', 10);
    const x = MARGIN_LEFT + indent;
    const lineHeight = 14;

    this.ensureSpace(lineHeight);

    this.page.drawText(label + ':', {
      x,
      y: this.y,
      size: 10,
      font: this.fontBold,
      color: COLOR_DARK_GRAY,
    });

    // Value may need wrapping
    const valueMaxWidth = CONTENT_WIDTH - indent - labelWidth;
    if (valueMaxWidth > 80) {
      const lines = wrapText(value, this.fontRegular, 10, valueMaxWidth);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          this.ensureSpace(lineHeight);
        }
        this.page.drawText(lines[i], {
          x: x + labelWidth,
          y: this.y,
          size: 10,
          font: this.fontRegular,
          color: COLOR_BLACK,
        });
        if (i < lines.length - 1) this.y -= lineHeight;
      }
    } else {
      this.page.drawText(value, {
        x: x + labelWidth,
        y: this.y,
        size: 10,
        font: this.fontRegular,
        color: COLOR_BLACK,
      });
    }

    this.y -= lineHeight;
  }

  private drawSectionHeader(number: string, title: string): void {
    this.ensureSpace(32);
    this.y -= 8;

    // Background bar
    this.page.drawRectangle({
      x: MARGIN_LEFT,
      y: this.y - 4,
      width: CONTENT_WIDTH,
      height: 20,
      color: COLOR_SECTION_BG,
    });

    this.page.drawText(`${number}  ${title}`, {
      x: MARGIN_LEFT + 8,
      y: this.y,
      size: 11,
      font: this.fontBold,
      color: COLOR_DARK_GRAY,
    });

    this.y -= 22;
  }

  private drawHRule(): void {
    this.ensureSpace(8);
    this.page.drawLine({
      start: { x: MARGIN_LEFT, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: this.y },
      thickness: 0.5,
      color: COLOR_LIGHT_GRAY,
    });
    this.y -= 8;
  }

  private drawSpacer(height = 6): void {
    this.y -= height;
  }

  // ----------------------------------------------------------
  // Header (Page 1)
  // ----------------------------------------------------------

  private drawHeader(): void {
    // Dark header band
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 88,
      width: PAGE_WIDTH,
      height: 88,
      color: COLOR_HEADER_BG,
    });

    // Title
    this.page.drawText('STANDARD INDUSTRIAL/COMMERCIAL', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 36,
      size: 14,
      font: this.fontBold,
      color: COLOR_WHITE,
    });
    this.page.drawText('MULTI-TENANT LEASE \u2014 NET', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 54,
      size: 14,
      font: this.fontBold,
      color: COLOR_WHITE,
    });

    // Form type badge
    const formType = this.lease.form_type || 'AIR_MTN_NET';
    const formVersion = this.lease.form_version || '';
    this.page.drawText(`AIR ${formType}${formVersion ? ` v${formVersion}` : ''}`, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 72,
      size: 9,
      font: this.fontItalic,
      color: rgb(0.7, 0.7, 0.8),
    });

    // Reference date in top right
    if (this.lease.reference_date) {
      const dateStr = fmtDate(this.lease.reference_date);
      const dateWidth = this.fontRegular.widthOfTextAtSize(dateStr, 10);
      this.page.drawText(dateStr, {
        x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
        y: PAGE_HEIGHT - 36,
        size: 10,
        font: this.fontRegular,
        color: COLOR_WHITE,
      });

      const labelWidth = this.fontItalic.widthOfTextAtSize('Reference Date', 8);
      this.page.drawText('Reference Date', {
        x: PAGE_WIDTH - MARGIN_RIGHT - labelWidth,
        y: PAGE_HEIGHT - 50,
        size: 8,
        font: this.fontItalic,
        color: rgb(0.7, 0.7, 0.8),
      });
    }

    this.y = PAGE_HEIGHT - 105;
  }

  // ----------------------------------------------------------
  // Section 1.1 — Parties
  // ----------------------------------------------------------

  private drawSection11(): void {
    this.drawSectionHeader('1.1', 'Parties');
    this.drawField('Lessor', `${this.lease.lessor_name}${this.lease.lessor_entity_type ? `, a ${this.lease.lessor_entity_type}` : ''}`);
    this.drawField('Lessee', `${this.lease.lessee_name}${this.lease.lessee_entity_type ? `, a ${this.lease.lessee_entity_type}` : ''}`);
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.2(a) — Premises
  // ----------------------------------------------------------

  private drawSection12(): void {
    this.drawSectionHeader('1.2(a)', 'Premises');

    const addressParts = [
      this.lease.premises_address,
      this.lease.premises_city,
      this.lease.premises_county ? `${this.lease.premises_county} County` : null,
      this.lease.premises_state,
      this.lease.premises_zip,
    ].filter(Boolean);

    this.drawField('Address', addressParts.join(', '));
    this.drawField('Rentable Area', `${fmtNumber(this.lease.premises_sf)} square feet`);

    if (this.lease.premises_description) {
      this.drawSpacer(4);
      this.drawText(this.lease.premises_description, {
        font: this.fontItalic,
        size: 9,
        color: COLOR_GRAY,
        x: MARGIN_LEFT + 12,
      });
    }
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.2(b) — Parking
  // ----------------------------------------------------------

  private drawSection12b(): void {
    this.drawSectionHeader('1.2(b)', 'Parking');
    this.drawField('Spaces', this.lease.parking_spaces != null ? `${this.lease.parking_spaces}` : 'N/A');
    this.drawField('Type', this.lease.parking_type ? this.lease.parking_type.charAt(0).toUpperCase() + this.lease.parking_type.slice(1) : 'Unreserved');
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.3 — Term
  // ----------------------------------------------------------

  private drawSection13(): void {
    this.drawSectionHeader('1.3', 'Term');

    const durationParts: string[] = [];
    if (this.lease.term_years) durationParts.push(`${this.lease.term_years} year${this.lease.term_years > 1 ? 's' : ''}`);
    if (this.lease.term_months) durationParts.push(`${this.lease.term_months} month${this.lease.term_months > 1 ? 's' : ''}`);

    this.drawField('Duration', durationParts.join(', ') || '--');
    this.drawField('Commencement Date', fmtDate(this.lease.commencement_date));
    this.drawField('Expiration Date', fmtDate(this.lease.expiration_date));
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.4 — Early Possession
  // ----------------------------------------------------------

  private drawSection14(): void {
    this.drawSectionHeader('1.4', 'Early Possession');
    if (this.lease.early_possession_terms) {
      this.drawText(this.lease.early_possession_terms, { size: 10 });
    } else {
      this.drawText('No early possession terms.', { font: this.fontItalic, size: 9, color: COLOR_GRAY });
    }
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.5 — Base Rent
  // ----------------------------------------------------------

  private drawSection15(): void {
    this.drawSectionHeader('1.5', 'Base Rent');
    this.drawField('Monthly Base Rent', fmtCurrency(this.lease.base_rent_monthly));
    this.drawField('Payable On', `The ${this.lease.base_rent_payable_day || 'first'} of each month`);
    this.drawField('Rent Commencement', fmtDate(this.lease.base_rent_commencement));
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.6 — CAM / Operating Expenses
  // ----------------------------------------------------------

  private drawSection16(): void {
    this.drawSectionHeader('1.6', 'Common Area Maintenance (CAM)');
    this.drawField("Lessee's Share", this.lease.cam_percent != null ? `${this.lease.cam_percent}%` : '--');
    this.drawField('Description', this.lease.cam_description || '--');
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.7 — Monies Due Upon Execution
  // ----------------------------------------------------------

  private drawSection17(): void {
    this.drawSectionHeader('1.7', 'Monies Due Upon Execution of this Lease');

    // Table-like layout for the money items
    const items: Array<{ label: string; period: string; amount: string }> = [];

    if (this.lease.exec_base_rent_amount != null) {
      items.push({
        label: 'Base Rent',
        period: this.lease.exec_base_rent_period || '',
        amount: fmtCurrency(this.lease.exec_base_rent_amount),
      });
    }
    if (this.lease.exec_cam_amount != null) {
      items.push({
        label: 'CAM / Operating Expenses',
        period: this.lease.exec_cam_period || '',
        amount: fmtCurrency(this.lease.exec_cam_amount),
      });
    }
    if (this.lease.exec_security_deposit != null) {
      items.push({
        label: 'Security Deposit',
        period: '',
        amount: fmtCurrency(this.lease.exec_security_deposit),
      });
    }
    if (this.lease.exec_other_amount != null) {
      items.push({
        label: this.lease.exec_other_description || 'Other',
        period: '',
        amount: fmtCurrency(this.lease.exec_other_amount),
      });
    }

    if (items.length === 0) {
      this.drawText('No monies specified.', { font: this.fontItalic, size: 9, color: COLOR_GRAY });
    } else {
      // Draw a simple table
      const colX = [MARGIN_LEFT + 12, MARGIN_LEFT + 220, MARGIN_LEFT + 360];

      // Header row
      this.ensureSpace(16);
      this.page.drawText('Item', { x: colX[0], y: this.y, size: 9, font: this.fontBold, color: COLOR_GRAY });
      this.page.drawText('Period', { x: colX[1], y: this.y, size: 9, font: this.fontBold, color: COLOR_GRAY });
      this.page.drawText('Amount', { x: colX[2], y: this.y, size: 9, font: this.fontBold, color: COLOR_GRAY });
      this.y -= 14;
      this.drawHRule();

      for (const item of items) {
        this.ensureSpace(14);
        this.page.drawText(item.label, { x: colX[0], y: this.y, size: 10, font: this.fontRegular, color: COLOR_BLACK });
        this.page.drawText(item.period, { x: colX[1], y: this.y, size: 10, font: this.fontRegular, color: COLOR_BLACK });
        this.page.drawText(item.amount, { x: colX[2], y: this.y, size: 10, font: this.fontBold, color: COLOR_BLACK });
        this.y -= 14;
      }

      // Total
      this.drawHRule();
      this.ensureSpace(16);
      this.page.drawText('TOTAL DUE UPON EXECUTION', { x: colX[0], y: this.y, size: 10, font: this.fontBold, color: COLOR_DARK_GRAY });
      this.page.drawText(fmtCurrency(this.lease.total_due_upon_execution), { x: colX[2], y: this.y, size: 11, font: this.fontBold, color: COLOR_BLACK });
      this.y -= 16;
    }
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.8 — Agreed Use
  // ----------------------------------------------------------

  private drawSection18(): void {
    this.drawSectionHeader('1.8', 'Agreed Use');
    this.drawText(this.lease.agreed_use || 'Not specified.', {
      font: this.lease.agreed_use ? this.fontRegular : this.fontItalic,
      size: 10,
      color: this.lease.agreed_use ? COLOR_BLACK : COLOR_GRAY,
    });
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.9 — Insuring Party
  // ----------------------------------------------------------

  private drawSection19(): void {
    this.drawSectionHeader('1.9', 'Insuring Party');
    this.drawField('Insuring Party', this.lease.insuring_party || 'Lessor');
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.10 — Brokers
  // ----------------------------------------------------------

  private drawSection110(): void {
    this.drawSectionHeader('1.10', 'Real Estate Brokers');

    if (this.lease.broker_representation_type) {
      this.drawField('Representation', `${this.lease.broker_representation_type.charAt(0).toUpperCase() + this.lease.broker_representation_type.slice(1)} Agency`);
    }

    if (this.lease.lessors_broker_name) {
      const brokerInfo = [this.lease.lessors_broker_name, this.lease.lessors_broker_company].filter(Boolean).join(' \u2014 ');
      this.drawField("Lessor's Broker", brokerInfo);
    }

    if (this.lease.lessees_broker_name) {
      const brokerInfo = [this.lease.lessees_broker_name, this.lease.lessees_broker_company].filter(Boolean).join(' \u2014 ');
      this.drawField("Lessee's Broker", brokerInfo);
    }

    if (this.lease.broker_payment_terms) {
      this.drawSpacer(4);
      this.drawField('Payment Terms', this.lease.broker_payment_terms);
    }
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.11 — Guarantor
  // ----------------------------------------------------------

  private drawSection111(): void {
    this.drawSectionHeader('1.11', 'Guarantor(s)');
    this.drawField('Guarantor(s)', this.lease.guarantor_names || 'None');
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Section 1.12 — Attachments
  // ----------------------------------------------------------

  private drawSection112(): void {
    this.drawSectionHeader('1.12', 'Attachments');

    const attachments: string[] = [];

    if (this.lease.addendum_paragraph_start && this.lease.addendum_paragraph_end) {
      attachments.push(`Addendum (Paragraphs ${this.lease.addendum_paragraph_start}\u2013${this.lease.addendum_paragraph_end})`);
    }
    if (this.lease.has_site_plan_premises) {
      attachments.push('Site Plan \u2014 Premises');
    }
    if (this.lease.has_site_plan_project) {
      attachments.push('Site Plan \u2014 Project');
    }
    if (this.lease.has_rules_and_regulations) {
      attachments.push('Rules and Regulations');
    }
    if (this.lease.other_attachments) {
      attachments.push(this.lease.other_attachments);
    }

    if (attachments.length === 0) {
      this.drawText('No attachments.', { font: this.fontItalic, size: 9, color: COLOR_GRAY });
    } else {
      for (const att of attachments) {
        this.ensureSpace(14);
        this.page.drawText('\u2022', { x: MARGIN_LEFT + 12, y: this.y, size: 10, font: this.fontRegular, color: COLOR_DARK_GRAY });
        this.drawText(att, { x: MARGIN_LEFT + 24, size: 10 });
      }
    }
    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Rent Escalation Schedule
  // ----------------------------------------------------------

  private drawEscalationSchedule(): void {
    this.ensureSpace(60);
    this.drawSpacer(8);

    // Section header
    this.drawSectionHeader('Schedule', 'Rent Escalation Schedule');

    const colXs = [MARGIN_LEFT + 12, MARGIN_LEFT + 80, MARGIN_LEFT + 220, MARGIN_LEFT + 340];

    // Table header
    this.ensureSpace(16);
    const headers = ['Year', 'Effective Date', '$/SF', 'Monthly Amount'];
    for (let i = 0; i < headers.length; i++) {
      this.page.drawText(headers[i], {
        x: colXs[i],
        y: this.y,
        size: 9,
        font: this.fontBold,
        color: COLOR_GRAY,
      });
    }
    this.y -= 14;
    this.drawHRule();

    // Rows
    for (let r = 0; r < this.escalations.length; r++) {
      const esc = this.escalations[r];
      this.ensureSpace(16);

      // Alternate row shading
      if (r % 2 === 0) {
        this.page.drawRectangle({
          x: MARGIN_LEFT + 8,
          y: this.y - 4,
          width: CONTENT_WIDTH - 16,
          height: 16,
          color: rgb(0.97, 0.97, 0.98),
        });
      }

      this.page.drawText(`Year ${esc.year_number}`, {
        x: colXs[0],
        y: this.y,
        size: 10,
        font: this.fontRegular,
        color: COLOR_BLACK,
      });
      this.page.drawText(fmtDate(esc.effective_date), {
        x: colXs[1],
        y: this.y,
        size: 10,
        font: this.fontRegular,
        color: COLOR_BLACK,
      });
      this.page.drawText(`$${esc.rent_per_sqft.toFixed(2)}`, {
        x: colXs[2],
        y: this.y,
        size: 10,
        font: this.fontRegular,
        color: COLOR_BLACK,
      });
      this.page.drawText(fmtCurrency(esc.monthly_amount), {
        x: colXs[3],
        y: this.y,
        size: 10,
        font: this.fontBold,
        color: COLOR_BLACK,
      });

      this.y -= 16;
    }

    this.drawSpacer();
  }

  // ----------------------------------------------------------
  // Footer on all pages
  // ----------------------------------------------------------

  private drawFooterOnAllPages(): void {
    const pages = this.doc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const pg = pages[i];

      // Separator line
      pg.drawLine({
        start: { x: MARGIN_LEFT, y: MARGIN_BOTTOM - 10 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: MARGIN_BOTTOM - 10 },
        thickness: 0.5,
        color: COLOR_LIGHT_GRAY,
      });

      // Left: lease reference
      const refText = `${this.lease.lessee_name} \u2014 ${this.lease.premises_address}`;
      pg.drawText(refText.length > 60 ? refText.substring(0, 57) + '...' : refText, {
        x: MARGIN_LEFT,
        y: MARGIN_BOTTOM - 24,
        size: 7,
        font: this.fontItalic,
        color: COLOR_GRAY,
      });

      // Right: page number
      const pageText = `Page ${i + 1} of ${totalPages}`;
      const pageTextWidth = this.fontRegular.widthOfTextAtSize(pageText, 7);
      pg.drawText(pageText, {
        x: PAGE_WIDTH - MARGIN_RIGHT - pageTextWidth,
        y: MARGIN_BOTTOM - 24,
        size: 7,
        font: this.fontRegular,
        color: COLOR_GRAY,
      });
    }
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Generates a complete lease PDF as a Uint8Array.
 */
export async function generateLeasePdf(
  lease: LeaseWithRelations,
  escalations: RentEscalation[],
): Promise<Uint8Array> {
  const builder = new LeasePdfBuilder(lease, escalations);
  return builder.build();
}
