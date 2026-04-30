/**
 * Authorization audit. For every API route file:
 *   - List the HTTP methods exported (GET, POST, PUT, PATCH, DELETE)
 *   - Detect whether the file imports an auth guard
 *   - For each non-public mutation, flag if no auth guard or no ownership check is visible
 *
 * Public routes (intentionally unauthenticated) are recognized via the
 * middleware's allowlist and excluded from "missing auth" findings.
 *
 * Run: node scripts/authz-audit.mjs
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PUBLIC_API_ROUTES = [
  '/api/webhooks/',
  '/api/public/',
  '/api/applications/status',
  /^\/api\/applications\/[^/]+\/documents/,  // public upload during application
  '/api/applications',                        // POST is public submit
  /^\/api\/lois\/[^/]+\/review-data/,
  /^\/api\/lois\/[^/]+\/respond/,
  /^\/api\/properties\/[^/]+\/inspection-slots/,
  /^\/api\/properties\/[^/]+\/book-inspection/,
  '/api/invitations/accept',
  /^\/api\/deals\/[^/]+\/[^/]+\/comments/,
  /^\/api\/checklists\/public\//,
  /^\/api\/checklists\/[^/]+\/items\/[^/]+$/,
];

const isPublicRoute = (pathname) =>
  PUBLIC_API_ROUTES.some((p) =>
    typeof p === 'string'
      ? pathname === p || pathname.startsWith(`${p}/`)
      : p.test(pathname),
  );

function fileToRoutePath(file) {
  // src/app/api/foo/[id]/bar/route.ts → /api/foo/[id]/bar
  return file
    .replace(/^src\/app/, '')
    .replace(/\/route\.ts$/, '');
}

const files = execSync('find src/app/api -name "route.ts"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const findings = [];
function flag(severity, route, method, issue) {
  findings.push({ severity, route, method, issue });
}

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const route = fileToRoutePath(file);
  const isPublic = isPublicRoute(route);

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    .filter((m) => new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(content));

  if (methods.length === 0) continue;

  const hasAuthGuard = /requireAuthForApi|requireBrokerOrAdminForApi|requireLandlordOrAgentForApi|requireTenantOrAgentForApi/.test(content);
  const hasOwnershipCheck =
    /effectiveContactId|landlord_contact_id|tenant_contact_id|broker_contact_id|user\.id\s*===\s*|verify.*party|Forbidden.*not a party/.test(content);
  // Currently informational only — could be used to relax the no-auth flag for
  // webhook routes in a future revision.
  const _hasWebhookSig = /verifyDocuSignSignature|verifyWebhookSignature|hmac/i.test(content);
  void _hasWebhookSig;

  for (const method of methods) {
    const isMutation = method !== 'GET' && method !== 'HEAD';

    if (isPublic) {
      // For public routes, mutations should still be safe — typically scoped by token / signed link / public submit
      if (isMutation && !/verifyLoiReviewToken|verifyDocuSignSignature|verifyWebhookSignature|hmac|access_token|signed/i.test(content)) {
        flag('info', route, method, 'public mutation — confirm input is sanitized + scoped');
      }
      continue;
    }

    if (!hasAuthGuard) {
      flag('FAIL', route, method, 'no auth guard found');
      continue;
    }

    // For mutations on resources owned by a specific party, an ownership check is expected.
    // GET endpoints are usually OK with role check + RLS; mutations should additionally
    // verify the caller is a party to the record they're modifying.
    const isResourceMutation =
      isMutation &&
      /\/api\/(lois|leases|applications|invoices|comps|properties|units)\/\[id\]/.test(route);

    if (isResourceMutation && !hasOwnershipCheck && !/requireBrokerOrAdminForApi/.test(content)) {
      flag('WARN', route, method, 'mutation on a tenant/landlord-owned resource — verify ownership check');
    }
  }
}

const counts = { FAIL: 0, WARN: 0, info: 0 };
for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

console.log(`\nFAIL: ${counts.FAIL}    WARN: ${counts.WARN}    info: ${counts.info}\n`);

const order = { FAIL: 0, WARN: 1, info: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.route.localeCompare(b.route));

for (const f of findings) {
  const icon = f.severity === 'FAIL' ? '✗' : f.severity === 'WARN' ? '!' : 'i';
  console.log(`  ${icon} ${f.severity.padEnd(4)} ${f.method.padEnd(6)} ${f.route}  — ${f.issue}`);
}

process.exit(counts.FAIL > 0 ? 1 : 0);
