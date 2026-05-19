import { PDFDocument, StandardFonts, rgb, PDFImage } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { EnrichedInvoice } from '@/lib/invoice/enrich';
import { BROKER_CONFIG } from '@/lib/config/broker';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const COLORS = {
  primary: hexToRgb('#1e40af'),
  dark: hexToRgb('#0f172a'),
  muted: hexToRgb('#64748b'),
  border: hexToRgb('#e2e8f0'),
  bgLight: hexToRgb('#f8fafc'),
  white: rgb(1, 1, 1),
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

const LOGO_FILENAME = 'invoice-logo.png';

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public', LOGO_FILENAME);
    const bytes = await readFile(logoPath);
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

/**
 * Generate a branded PDF for a commission invoice using pdf-lib.
 */
export async function generateInvoicePdf(
  invoice: EnrichedInvoice,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc);

  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const PAGE_WIDTH = 612;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  let y = 742;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    options: {
      size?: number;
      font?: typeof helvetica;
      color?: ReturnType<typeof rgb>;
      align?: 'left' | 'right';
    } = {},
  ) => {
    const font = options.font ?? helvetica;
    const size = options.size ?? 10;
    const color = options.color ?? COLORS.dark;
    const width = font.widthOfTextAtSize(text, size);
    const xPos = options.align === 'right' ? x - width : x;
    page.drawText(text, { x: xPos, y: yPos, size, font, color });
  };

  const drawLine = (yPos: number, color = COLORS.border) => {
    page.drawLine({
      start: { x: MARGIN_LEFT, y: yPos },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: yPos },
      thickness: 0.5,
      color,
    });
  };

  // -----------------------------------------------------------------
  // Header — logo (or text wordmark fallback) + invoice title
  // -----------------------------------------------------------------
  if (logo) {
    // The logo already includes the "ROCKET REALTY" wordmark, so we don't
    // draw separate text. Scale to ~46pt tall so the wordmark inside the
    // logo stays readable.
    const maxHeight = 46;
    const ratio = logo.width / logo.height;
    const drawHeight = Math.min(maxHeight, logo.height);
    const drawWidth = drawHeight * ratio;
    page.drawImage(logo, {
      x: MARGIN_LEFT,
      y: y - drawHeight + 14,
      width: drawWidth,
      height: drawHeight,
    });
  } else {
    drawText('ROCKET REALTY', MARGIN_LEFT, y, {
      size: 18,
      font: helveticaBold,
      color: COLORS.primary,
    });
  }

  // Invoice title — right-aligned
  drawText('COMMISSION INVOICE', PAGE_WIDTH - MARGIN_RIGHT, y, {
    size: 16,
    font: helveticaBold,
    color: COLORS.dark,
    align: 'right',
  });
  y -= 18;
  drawText(`Invoice #${invoice.invoice_number}`, PAGE_WIDTH - MARGIN_RIGHT, y, {
    size: 10,
    color: COLORS.muted,
    align: 'right',
  });

  // Push past the logo bottom edge so the divider clears it
  y -= 24;
  drawLine(y);

  // -----------------------------------------------------------------
  // Dates
  // -----------------------------------------------------------------
  y -= 22;
  drawText('Invoice Date:', MARGIN_LEFT, y, { size: 9, color: COLORS.muted });
  drawText(formatDate(invoice.created_at), MARGIN_LEFT + 72, y, {
    size: 9,
    font: helveticaBold,
  });

  if (invoice.due_date) {
    drawText('Due Date:', MARGIN_LEFT + 240, y, {
      size: 9,
      color: COLORS.muted,
    });
    drawText(formatDate(invoice.due_date), MARGIN_LEFT + 300, y, {
      size: 9,
      font: helveticaBold,
    });
  }

  // -----------------------------------------------------------------
  // Property / parties block — pulled from the lease
  // -----------------------------------------------------------------
  y -= 30;

  const propertyLine = invoice.premises_full ||
    [invoice.property_address, invoice.suite_number].filter(Boolean).join(', ');

  const propertyParties: Array<[string, string]> = [];
  if (propertyLine) propertyParties.push(['PREMISES', propertyLine]);
  if (invoice.lessor_name) propertyParties.push(['LESSOR', invoice.lessor_name]);
  if (invoice.lessee_name) propertyParties.push(['LESSEE (TENANT)', invoice.lessee_name]);

  for (const [label, value] of propertyParties) {
    drawText(label, MARGIN_LEFT, y, {
      size: 8,
      font: helveticaBold,
      color: COLORS.muted,
    });
    drawText(value, MARGIN_LEFT + 110, y, { size: 10 });
    y -= 16;
  }

  // -----------------------------------------------------------------
  // From / Bill To
  // -----------------------------------------------------------------
  y -= 16;
  drawText('FROM', MARGIN_LEFT, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
  });
  drawText('BILL TO', MARGIN_LEFT + CONTENT_WIDTH / 2, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
  });

  y -= 16;
  drawText('Rocket Realty', MARGIN_LEFT, y, { font: helveticaBold, size: 10 });
  drawText(invoice.payee_name ?? '', MARGIN_LEFT + CONTENT_WIDTH / 2, y, {
    font: helveticaBold,
    size: 10,
  });

  y -= 14;
  drawText(BROKER_CONFIG.address.street, MARGIN_LEFT, y, {
    size: 9,
    color: COLORS.muted,
  });
  drawText(invoice.payee_address ?? '', MARGIN_LEFT + CONTENT_WIDTH / 2, y, {
    size: 9,
    color: COLORS.muted,
  });

  y -= 14;
  drawText(
    `${BROKER_CONFIG.address.city}, ${BROKER_CONFIG.address.state} ${BROKER_CONFIG.address.zip}`,
    MARGIN_LEFT,
    y,
    { size: 9, color: COLORS.muted },
  );
  drawText(invoice.payee_city_state_zip ?? '', MARGIN_LEFT + CONTENT_WIDTH / 2, y, {
    size: 9,
    color: COLORS.muted,
  });

  // -----------------------------------------------------------------
  // Line items table
  // -----------------------------------------------------------------
  y -= 36;

  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: 22,
    color: COLORS.bgLight,
  });

  const COL_DESC = MARGIN_LEFT + 6;
  const COL_DETAIL = MARGIN_LEFT + CONTENT_WIDTH * 0.55;
  const COL_AMOUNT = PAGE_WIDTH - MARGIN_RIGHT - 6;

  drawText('DESCRIPTION', COL_DESC, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
  });
  drawText('DETAILS', COL_DETAIL, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
  });
  drawText('AMOUNT', COL_AMOUNT, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
    align: 'right',
  });

  y -= 24;
  drawLine(y + 2);

  const drawRow = (
    desc: string,
    detail: string,
    amount: string,
    opts?: { bold?: boolean },
  ) => {
    drawText(desc, COL_DESC, y, {
      size: 9,
      font: opts?.bold ? helveticaBold : helvetica,
    });
    drawText(detail, COL_DETAIL, y, { size: 9, color: COLORS.muted });
    if (amount) {
      drawText(amount, COL_AMOUNT, y, {
        size: 9,
        font: opts?.bold ? helveticaBold : helvetica,
        align: 'right',
      });
    }
    y -= 20;
    drawLine(y + 6);
  };

  drawRow('Lease Term', `${invoice.lease_term_months} months`, '');
  drawRow('Monthly Rent', `${formatCurrency(invoice.monthly_rent)} /mo`, '');

  // Annual + PSF breakdown when suite SF is known.
  if (invoice.suite_sf && invoice.suite_sf > 0) {
    const annualRent = invoice.monthly_rent * 12;
    const psfAnnual = annualRent / invoice.suite_sf;
    drawRow(
      'Annual Rent',
      `${invoice.suite_sf.toLocaleString()} SF`,
      `${formatCurrency(annualRent)} /yr`,
    );
    drawRow(
      'Rate per SF',
      'Annual basis',
      `${formatCurrency(psfAnnual)} /SF/yr`,
    );
  }

  drawRow(
    'Total Consideration',
    `${formatCurrency(invoice.monthly_rent)} x ${invoice.lease_term_months} mo`,
    formatCurrency(invoice.total_consideration),
    { bold: true },
  );
  drawRow('Commission Rate', `${invoice.commission_rate_percent}%`, '');

  // Total due row
  y -= 4;
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 6,
    width: CONTENT_WIDTH,
    height: 28,
    color: COLORS.bgLight,
  });

  drawText('COMMISSION DUE', COL_DETAIL, y, {
    size: 10,
    font: helveticaBold,
    color: COLORS.dark,
  });
  drawText(formatCurrency(invoice.commission_amount), COL_AMOUNT, y, {
    size: 13,
    font: helveticaBold,
    color: COLORS.primary,
    align: 'right',
  });

  // -----------------------------------------------------------------
  // Payment instructions
  // -----------------------------------------------------------------
  y -= 44;
  drawText('PAYMENT INSTRUCTIONS', MARGIN_LEFT, y, {
    size: 8,
    font: helveticaBold,
    color: COLORS.muted,
  });

  y -= 18;
  const instructions = (invoice.payment_instructions ?? '').split('\n');
  for (const line of instructions) {
    drawText(line, MARGIN_LEFT, y, { size: 9, color: COLORS.dark });
    y -= 14;
  }

  // -----------------------------------------------------------------
  // Footer
  // -----------------------------------------------------------------
  y = 40;
  drawLine(y + 8);
  drawText(
    'Thank you for your business.',
    PAGE_WIDTH / 2 -
      helvetica.widthOfTextAtSize('Thank you for your business.', 9) / 2,
    y - 6,
    { size: 9, color: COLORS.muted },
  );

  return doc.save();
}
