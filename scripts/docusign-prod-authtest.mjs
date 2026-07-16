/**
 * One-off: validate the PRODUCTION DocuSign JWT auth end-to-end before cutover.
 * Usage: node scripts/docusign-prod-authtest.mjs /path/to/prod-private-key.pem
 * Read-only (GET account info). Uses the confirmed prod IDs.
 */
import { SignJWT } from 'jose';
import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

const keyPath = process.argv[2];
if (!keyPath) { console.error('pass the private-key file path'); process.exit(1); }
const privateKey = createPrivateKey(readFileSync(keyPath, 'utf8').trim());

const INTEGRATION_KEY = '01612a96-66a0-4806-84a0-6af7dd49d17e';
const USER_ID = '1186eefc-8bae-4658-b576-1775afcf5402';
const ACCOUNT_ID = '0bdc186c-ebb5-4a64-8a7c-d0f634a6e2eb';
const AUTH = 'account.docusign.com';            // PRODUCTION auth server
const BASE = 'https://na3.docusign.net/restapi';

const now = Math.floor(Date.now() / 1000);
const assertion = await new SignJWT({
  iss: INTEGRATION_KEY, sub: USER_ID, aud: AUTH, scope: 'signature impersonation',
})
  .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
  .setIssuedAt(now).setExpirationTime(now + 3600).sign(privateKey);

const tok = await fetch(`https://${AUTH}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
const body = await tok.text();
console.log('OAuth token status:', tok.status);
if (!tok.ok) {
  console.log('Response:', body);
  if (body.includes('consent_required')) {
    console.log('\n>> CONSENT NEEDED (key is valid, just needs one-time user consent).');
    console.log(`Consent URL (needs a redirect URI registered on the prod key):`);
    console.log(`https://${AUTH}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=REDIRECT_URI`);
  }
  process.exit(0);
}
const { access_token } = JSON.parse(body);
console.log('Got PRODUCTION access token OK');
const r = await fetch(`${BASE}/v2.1/accounts/${ACCOUNT_ID}`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
console.log('Account API status:', r.status);
if (r.ok) {
  const a = await r.json();
  console.log('Connected to account:', a.accountName, '| plan:', a.planName);
  console.log('\nPRODUCTION DOCUSIGN AUTH WORKS END TO END.');
} else {
  console.log('Account API error:', await r.text());
}
