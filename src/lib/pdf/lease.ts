import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Lease, RentEscalation } from '@/types/database';

/** Hex color string to pdf-lib RGB */
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

function formatSqft(sqft: number): string {
  return new Intl.NumberFormat('en-US').format(sqft) + ' SF';
}

// ============================================================
// generateLeaseSummaryPdf
// ============================================================

/**
 * Generate a professional lease summary PDF.
 *
 * This is NOT the full AIR form (that is a pre-printed form filled via DocuSign).
 * This is a clean summary PDF of all agreed terms, suitable for internal review
 * or as a cover sheet.
 *
 * Uses pdf-lib with built-in Helvetica fonts (no external font files needed).
 * Returns raw PDF bytes as Uint8Array.
 */
export async function generateLeaseSummaryPdf(
  lease: Lease,
  escalations: RentEscalation[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const MARGIN_BOTTOM = 50;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN_BOTTOM) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 50;
    }
  }

  function drawText(
    text: string,
    x: number,
    yPos: number,
    options: {
      size?: number;
      font?: typeof helvetica;
      color?: ReturnType<typeof rgb>;
      align?: 'left' | 'right' | 'center';
    } = {},
  ) {
    const font = options.font ?? helvetica;
    const size = options.size ?? 10;
    const color = options.color ?? COLORS.dark;
    const width = font.widthOfTextAtSize(text, size);
    let xPos = x;
    if (options.align === 'right') xPos = x - width;
    else if (options.align === 'center') xPos = x - width / 2;
    page.drawText(text, { x: xPos, y: yPos, size, font, color });
  }

  function drawLine(yPos: number, color = COLORS.border) {
    page.drawLine({
      start: { x: MARGIN_LEFT, y: yPos },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: yPos },
      thickness: 0.5,
      color,
    });
  }

  function drawSectionHeader(number: string, title: string) {
    ensureSpace(30);
    y -= 8;
    drawLine(y + 4);
    y -= 16;
    drawText(`${number}  ${title}`, MARGIN_LEFT, y, {
      size: 11,
      font: helveticaBold,
      color: COLORS.primary,
    });
    y -= 6;
  }

  function drawInfoRow(label: string, value: string | null | undefined) {
    ensureSpace(18);
    y -= 16;
    drawText(label, MARGIN_LEFT + 8, y, { size: 9, color: COLORS.muted });
    drawText(value || '---', MARGIN_LEFT + 160, y, { size: 9 });
  }

  function drawWrappedText(text: string, x: number, maxWidth: number, size: number = 9) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = helvetica.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        ensureSpace(14);
        y -= 14;
        drawText(line, x, y, { size });
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ensureSpace(14);
      y -= 14;
      drawText(line, x, y, { size });
    }
  }

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  drawText('ROCKET REALTY', MARGIN_LEFT, y, {
    size: 20,
    font: helveticaBold,
    color: COLORS.primary,
  });
  y -= 16;
  drawText('Commercial Real Estate Brokerage', MARGIN_LEFT, y, {
    size: 9,
    color: COLORS.muted,
  });

  drawText('LEASE SUMMARY', PAGE_WIDTH - MARGIN_RIGHT, y + 16, {
    size: 18,
    font: helveticaBold,
    color: COLORS.dark,
    align: 'right',
  });

  if (lease.form_type) {
    drawText(`${lease.form_type}${lease.form_version ? ' · ' + lease.form_version : ''}`, PAGE_WIDTH - MARGIN_RIGHT, y, {
      size: 9,
      color: COLORS.muted,
      align: 'right',
    });
  }

  y -= 10;
  drawLine(y, COLORS.primary);

  // Reference date
  if (lease.reference_date) {
    y -= 18;
    drawText('Reference Date:', MARGIN_LEFT, y, { size: 9, color: COLORS.muted });
    drawText(formatDate(lease.reference_date), MARGIN_LEFT + 90, y, {
      size: 9,
      font: helveticaBold,
    });
  }

  // ---------------------------------------------------------------------------
  // Section 1.1 — Parties
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.1', 'Parties');
  drawInfoRow('Lessor', lease.lessor_name + (lease.lessor_entity_type ? `, ${lease.lessor_entity_type}` : ''));
  drawInfoRow('Lessee', lease.lessee_name + (lease.lessee_entity_type ? `, ${lease.lessee_entity_type}` : ''));

  // ---------------------------------------------------------------------------
  // Section 1.2(a) — Premises
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.2(a)', 'Premises');
  drawInfoRow('Address', lease.premises_address);
  drawInfoRow('City / State / ZIP', `${lease.premises_city}, ${lease.premises_state} ${lease.premises_zip || ''}`);
  if (lease.premises_county) {
    drawInfoRow('County', lease.premises_county);
  }
  drawInfoRow('Square Footage', formatSqft(lease.premises_sf));
  if (lease.premises_description) {
    ensureSpace(18);
    y -= 16;
    drawText('Description:', MARGIN_LEFT + 8, y, { size: 9, color: COLORS.muted });
    drawWrappedText(lease.premises_description, MARGIN_LEFT + 8, CONTENT_WIDTH - 16);
  }

  // ---------------------------------------------------------------------------
  // Section 1.2(b) — Parking
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.2(b)', 'Parking');
  drawInfoRow('Spaces', lease.parking_spaces?.toString() ?? '---');
  drawInfoRow('Type', lease.parking_type ? lease.parking_type.charAt(0).toUpperCase() + lease.parking_type.slice(1) : '---');

  // ---------------------------------------------------------------------------
  // Section 1.3 — Term
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.3', 'Term');
  const termParts = [
    lease.term_years ? `${lease.term_years} year${lease.term_years > 1 ? 's' : ''}` : null,
    lease.term_months ? `${lease.term_months} month${lease.term_months > 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  drawInfoRow('Duration', termParts.join(', ') || '---');
  drawInfoRow('Commencement', lease.commencement_date ? formatDate(lease.commencement_date) : null);
  drawInfoRow('Expiration', lease.expiration_date ? formatDate(lease.expiration_date) : null);

  // ---------------------------------------------------------------------------
  // Section 1.4 — Early Possession
  // ---------------------------------------------------------------------------

  if (lease.early_possession_terms) {
    drawSectionHeader('1.4', 'Early Possession');
    drawWrappedText(lease.early_possession_terms, MARGIN_LEFT + 8, CONTENT_WIDTH - 16);
  }

  // ---------------------------------------------------------------------------
  // Section 1.5 — Base Rent
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.5', 'Base Rent');
  drawInfoRow('Monthly Base Rent', formatCurrency(lease.base_rent_monthly));
  drawInfoRow('Payable On', `${lease.base_rent_payable_day} of each month`);
  drawInfoRow('Rent Commencement', lease.base_rent_commencement ? formatDate(lease.base_rent_commencement) : null);

  // ---------------------------------------------------------------------------
  // Section 1.6 — CAM / Operating Expenses
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.6', 'CAM / Operating Expenses');
  drawInfoRow('Percentage', lease.cam_percent != null ? `${lease.cam_percent}%` : null);
  if (lease.cam_description) {
    ensureSpace(18);
    y -= 16;
    drawText('Description:', MARGIN_LEFT + 8, y, { size: 9, color: COLORS.muted });
    drawWrappedText(lease.cam_description, MARGIN_LEFT + 8, CONTENT_WIDTH - 16);
  }

  // ---------------------------------------------------------------------------
  // Section 1.7 — Monies Due Upon Execution
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.7', 'Monies Due Upon Execution');
  if (lease.exec_base_rent_amount != null) {
    drawInfoRow('Base Rent', `${formatCurrency(lease.exec_base_rent_amount)}${lease.exec_base_rent_period ? ` / ${lease.exec_base_rent_period}` : ''}`);
  }
  if (lease.exec_cam_amount != null) {
    drawInfoRow('CAM / Operating', `${formatCurrency(lease.exec_cam_amount)}${lease.exec_cam_period ? ` / ${lease.exec_cam_period}` : ''}`);
  }
  if (lease.exec_security_deposit != null) {
    drawInfoRow('Security Deposit', formatCurrency(lease.exec_security_deposit));
  }
  if (lease.exec_other_amount != null) {
    drawInfoRow(lease.exec_other_description || 'Other', formatCurrency(lease.exec_other_amount));
  }
  if (lease.total_due_upon_execution != null) {
    ensureSpace(22);
    y -= 20;
    drawText('Total Due Upon Execution:', MARGIN_LEFT + 8, y, {
      size: 10,
      font: helveticaBold,
    });
    drawText(formatCurrency(lease.total_due_upon_execution), PAGE_WIDTH - MARGIN_RIGHT, y, {
      size: 10,
      font: helveticaBold,
      color: COLORS.primary,
      align: 'right',
    });
  }

  // ---------------------------------------------------------------------------
  // Section 1.8 — Agreed Use
  // ---------------------------------------------------------------------------

  if (lease.agreed_use) {
    drawSectionHeader('1.8', 'Agreed Use');
    drawWrappedText(lease.agreed_use, MARGIN_LEFT + 8, CONTENT_WIDTH - 16);
  }

  // ---------------------------------------------------------------------------
  // Section 1.9 — Insuring Party
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.9', 'Insuring Party');
  drawInfoRow('Insuring Party', lease.insuring_party);

  // ---------------------------------------------------------------------------
  // Section 1.10 — Brokers
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.10', 'Brokers');
  if (lease.broker_representation_type) {
    drawInfoRow('Representation', lease.broker_representation_type.charAt(0).toUpperCase() + lease.broker_representation_type.slice(1) + ' Agency');
  }
  drawInfoRow("Lessor's Broker", lease.lessors_broker_name ? `${lease.lessors_broker_name}${lease.lessors_broker_company ? ' — ' + lease.lessors_broker_company : ''}` : null);
  drawInfoRow("Lessee's Broker", lease.lessees_broker_name ? `${lease.lessees_broker_name}${lease.lessees_broker_company ? ' — ' + lease.lessees_broker_company : ''}` : null);

  // ---------------------------------------------------------------------------
  // Section 1.11 — Guarantor
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.11', 'Guarantor');
  drawInfoRow('Guarantor(s)', lease.guarantor_names || 'None');

  // ---------------------------------------------------------------------------
  // Section 1.12 — Attachments
  // ---------------------------------------------------------------------------

  drawSectionHeader('1.12', 'Attachments');
  if (lease.addendum_paragraph_start && lease.addendum_paragraph_end) {
    drawInfoRow('Addendum', `Paragraphs ${lease.addendum_paragraph_start} - ${lease.addendum_paragraph_end}`);
  }
  drawInfoRow('Site Plan - Premises', lease.has_site_plan_premises ? 'Included' : 'Not included');
  drawInfoRow('Site Plan - Project', lease.has_site_plan_project ? 'Included' : 'Not included');
  drawInfoRow('Rules & Regulations', lease.has_rules_and_regulations ? 'Included' : 'Not included');
  if (lease.other_attachments) {
    drawInfoRow('Other', lease.other_attachments);
  }

  // ---------------------------------------------------------------------------
  // Rent Escalation Schedule Table
  // ---------------------------------------------------------------------------

  if (escalations.length > 0) {
    ensureSpace(60);
    y -= 12;
    drawLine(y + 4);
    y -= 20;
    drawText('RENT ESCALATION SCHEDULE', MARGIN_LEFT, y, {
      size: 12,
      font: helveticaBold,
      color: COLORS.primary,
    });

    // Table header
    ensureSpace(30);
    y -= 22;
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - 4,
      width: CONTENT_WIDTH,
      height: 20,
      color: COLORS.bgLight,
    });

    const colYear = MARGIN_LEFT + 8;
    const colDate = MARGIN_LEFT + 70;
    const colSf = MARGIN_LEFT + 220;
    const colMonthly = MARGIN_LEFT + 320;
    const colNotes = MARGIN_LEFT + 420;

    drawText('Year', colYear, y, { size: 8, font: helveticaBold, color: COLORS.muted });
    drawText('Effective Date', colDate, y, { size: 8, font: helveticaBold, color: COLORS.muted });
    drawText('$/SF', colSf, y, { size: 8, font: helveticaBold, color: COLORS.muted });
    drawText('Monthly', colMonthly, y, { size: 8, font: helveticaBold, color: COLORS.muted });
    drawText('Notes', colNotes, y, { size: 8, font: helveticaBold, color: COLORS.muted });

    y -= 6;
    drawLine(y);

    // Table rows
    for (const esc of escalations) {
      ensureSpace(20);
      y -= 18;
      drawText(`Year ${esc.year_number}`, colYear, y, { size: 9 });
      drawText(formatDate(esc.effective_date), colDate, y, { size: 9 });
      drawText(`$${esc.rent_per_sqft.toFixed(2)}`, colSf, y, { size: 9 });
      drawText(formatCurrency(esc.monthly_amount), colMonthly, y, { size: 9, font: helveticaBold });
      drawText(esc.notes || '', colNotes, y, { size: 9, color: COLORS.muted });
    }

    // Total consideration
    y -= 6;
    drawLine(y);
    ensureSpace(24);
    y -= 20;

    let totalConsideration = 0;
    const termMonths = (lease.term_years ?? 0) * 12 + (lease.term_months ?? 0);
    for (let i = 0; i < escalations.length; i++) {
      const isLast = i === escalations.length - 1;
      const months = isLast ? Math.max(0, termMonths - i * 12) : 12;
      totalConsideration += escalations[i].monthly_amount * months;
    }

    drawText('Total Lease Consideration:', MARGIN_LEFT + 8, y, {
      size: 10,
      font: helveticaBold,
    });
    drawText(formatCurrency(totalConsideration), PAGE_WIDTH - MARGIN_RIGHT, y, {
      size: 10,
      font: helveticaBold,
      color: COLORS.primary,
      align: 'right',
    });
  }

  // ---------------------------------------------------------------------------
  // Signature Lines
  // ---------------------------------------------------------------------------

  ensureSpace(140);
  y -= 40;
  drawLine(y + 10, COLORS.primary);
  y -= 10;
  drawText('SIGNATURES', MARGIN_LEFT, y, {
    size: 12,
    font: helveticaBold,
    color: COLORS.primary,
  });

  const signatureLines: { label: string; name: string }[] = [
    { label: 'Lessor', name: lease.lessor_name },
    { label: 'Lessee', name: lease.lessee_name },
    { label: "Lessor's Broker", name: lease.lessors_broker_name || '' },
  ];
  if (lease.guarantor_names) {
    signatureLines.push({ label: 'Guarantor', name: lease.guarantor_names });
  }

  for (const sig of signatureLines) {
    ensureSpace(50);
    y -= 36;

    // Signature line
    page.drawLine({
      start: { x: MARGIN_LEFT + 8, y: y },
      end: { x: MARGIN_LEFT + 240, y: y },
      thickness: 0.5,
      color: COLORS.dark,
    });

    // Date line
    page.drawLine({
      start: { x: MARGIN_LEFT + 280, y: y },
      end: { x: MARGIN_LEFT + 400, y: y },
      thickness: 0.5,
      color: COLORS.dark,
    });

    y -= 12;
    drawText(`${sig.label}: ${sig.name}`, MARGIN_LEFT + 8, y, {
      size: 9,
      color: COLORS.muted,
    });
    drawText('Date', MARGIN_LEFT + 280, y, {
      size: 9,
      color: COLORS.muted,
    });
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  y = 36;
  drawLine(y + 8);
  const footerText = 'This is a summary of agreed lease terms. The full lease agreement governs in the event of any discrepancy.';
  const footerWidth = helvetica.widthOfTextAtSize(footerText, 8);
  drawText(footerText, PAGE_WIDTH / 2 - footerWidth / 2, y - 4, {
    size: 8,
    color: COLORS.muted,
  });

  return doc.save();
}
