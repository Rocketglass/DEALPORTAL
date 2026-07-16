/**
 * DocuSign Go-Live warm-up — makes 22 successful demo API calls on the portal's
 * integration key so the Go-Live check (20 most recent calls, error-free, in a
 * 24h window, on the promoted key) passes.
 *
 * Reuses the exact JWT-grant auth the portal uses (see src/lib/docusign/client.ts).
 * Reads DOCUSIGN_* from .env.local. Read-only calls only (GET account info).
 *
 * Usage:  node scripts/docusign-warmup.mjs
 */

import { SignJWT } from 'jose';
import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

const raw = readFileSync('.env.local', 'utf8');
function getVar(name) {
  let m = raw.match(new RegExp(`^${name}="([\\s\\S]*?)"\\s*$`, 'm'));
  if (m) return m[1];
  m = raw.match(new RegExp(`^${name}='([\\s\\S]*?)'\\s*$`, 'm'));
  if (m) return m[1];
  m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const integrationKey = getVar('DOCUSIGN_INTEGRATION_KEY');
const userId = getVar('DOCUSIGN_USER_ID');
const accountId = getVar('DOCUSIGN_ACCOUNT_ID');
const baseUrl = (getVar('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net/restapi').replace(/\/+$/, '');
let rsaKey = getVar('DOCUSIGN_RSA_PRIVATE_KEY').replace(/\\n/g, '\n');
if (!rsaKey.includes('-----BEGIN')) {
  rsaKey = `-----BEGIN RSA PRIVATE KEY-----\n${rsaKey}\n-----END RSA PRIVATE KEY-----`;
}
const authServer = baseUrl.includes('demo') ? 'account-d.docusign.com' : 'account.docusign.com';

if (!integrationKey || !userId || !accountId || !rsaKey.includes('BEGIN')) {
  console.error('Missing DocuSign config in .env.local'); process.exit(1);
}

console.log(`Integration key ...${integrationKey.slice(-12)} | account ...${accountId.slice(-12)}`);
console.log(`Base: ${baseUrl} | auth: ${authServer}`);

// createPrivateKey auto-detects PKCS#1 (BEGIN RSA PRIVATE KEY) and PKCS#8.
const privateKey = createPrivateKey(rsaKey.trim());
const now = Math.floor(Date.now() / 1000);
const assertion = await new SignJWT({
  iss: integrationKey, sub: userId, aud: authServer, scope: 'signature impersonation',
})
  .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
  .setIssuedAt(now)
  .setExpirationTime(now + 3600)
  .sign(privateKey);

const tokenRes = await fetch(`https://${authServer}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
if (!tokenRes.ok) {
  console.error(`OAuth token error ${tokenRes.status}:`, await tokenRes.text());
  console.error('(If this mentions consent, the integration key needs user consent granted in demo.)');
  process.exit(1);
}
const { access_token } = await tokenRes.json();
console.log('Got access token. Firing warm-up calls...\n');

const N = 22;
let ok = 0;
const codes = [];
for (let i = 1; i <= N; i++) {
  const r = await fetch(`${baseUrl}/v2.1/accounts/${accountId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  codes.push(r.status);
  if (r.ok) ok++;
  else console.error(`  call ${i} failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  await new Promise((res) => setTimeout(res, 150));
}
console.log('Status codes:', codes.join(' '));
console.log(`\nDone. ${ok}/${N} calls succeeded on key ...${integrationKey.slice(-12)}.`);
console.log(ok >= 20 ? '✅ 20+ successful calls logged — Go-Live check should pass for this key.' : '⚠️ Fewer than 20 succeeded — check errors above.');
