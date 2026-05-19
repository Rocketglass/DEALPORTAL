/**
 * Lease parser smoke test — standalone, no Next.js server required.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/smoke-lease-parse.mjs <path/to/lease.pdf>
 *
 * Calls Gemini 2.0 Flash with the same prompt + schema the production
 * /api/leases/parse endpoint uses, prints the extracted fields, and reports
 * confidence (which fields came back null).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set. Add it to your .env.local or export it.');
  process.exit(1);
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: GEMINI_API_KEY=... node scripts/smoke-lease-parse.mjs <path/to/lease.pdf>');
  process.exit(1);
}

const absolutePath = path.resolve(pdfPath);
const pdfBytes = readFileSync(absolutePath);
console.log(`Reading lease: ${absolutePath} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);

const SCHEMA = {
  type: 'object',
  properties: {
    lessor_name: { type: 'string', nullable: true },
    lessor_email: { type: 'string', nullable: true },
    lessor_address: { type: 'string', nullable: true },
    lessee_name: { type: 'string', nullable: true },
    lessee_email: { type: 'string', nullable: true },
    property_address: { type: 'string', nullable: true },
    suite_number: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    state: { type: 'string', nullable: true },
    zip: { type: 'string', nullable: true },
    suite_sf: { type: 'integer', nullable: true },
    lease_term_months: { type: 'integer', nullable: true },
    monthly_rent: { type: 'number', nullable: true },
    total_consideration: { type: 'number', nullable: true },
    annual_escalation_percent: { type: 'number', nullable: true },
    free_rent_months: { type: 'integer', nullable: true },
    commission_rate_percent: { type: 'number', nullable: true },
    commencement_date: { type: 'string', nullable: true },
  },
  required: [
    'lessor_name','lessor_email','lessor_address','lessee_name','lessee_email',
    'property_address','suite_number','city','state','zip','suite_sf',
    'lease_term_months','monthly_rent','total_consideration','annual_escalation_percent',
    'free_rent_months','commission_rate_percent','commencement_date',
  ],
};

const PROMPT = `You are extracting structured data from a commercial real estate lease PDF.
Return ONE JSON object matching the provided schema. For any field you cannot
find or are not confident about, return null — never guess.

Field guidance:
- lessor_name / lessor_email / lessor_address: the landlord party (the one
  RECEIVING rent). The lessor entity name, not a signatory's personal name
  unless the lessor is an individual.
- lessee_name / lessee_email: the tenant party (the one PAYING rent).
- property_address: street address of the leased premises. Just street + number.
- suite_number: the suite/unit identifier without the word "Suite".
- city / state / zip: from the premises address.
- suite_sf: leased square footage as an integer.
- lease_term_months: total lease term in months.
- monthly_rent: the INITIAL monthly base rent.
- total_consideration: total rent over the full term summing all escalations.
- annual_escalation_percent: annual rent bump as percent (3.0 for 3%).
- free_rent_months: abated/free rent months at term start.
- commission_rate_percent: brokerage commission rate from the broker comp clause.
- commencement_date: rent commencement date as YYYY-MM-DD.

If the document is not a lease, return all nulls.`;

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

const t0 = Date.now();
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: 'application/pdf', data: pdfBytes.toString('base64') } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      maxOutputTokens: 2048,
      temperature: 0.2,
    },
  }),
});

const elapsed = Date.now() - t0;
console.log(`Gemini responded in ${elapsed}ms`);

if (!res.ok) {
  console.error('Non-200:', res.status, await res.text());
  process.exit(1);
}

const body = await res.json();
const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
if (!text) {
  console.error('No content in response:', JSON.stringify(body).slice(0, 500));
  process.exit(1);
}

const fields = JSON.parse(text);
console.log('\n=== EXTRACTED FIELDS ===');
for (const [k, v] of Object.entries(fields)) {
  const display = v === null ? '(null)' : v;
  console.log(`${k.padEnd(28)} ${display}`);
}

const total = Object.keys(fields).length;
const filled = Object.values(fields).filter((v) => v !== null && v !== '').length;
console.log(`\nFilled ${filled}/${total} fields.`);
