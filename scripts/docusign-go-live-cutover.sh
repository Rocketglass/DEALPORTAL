#!/usr/bin/env bash
# DocuSign Go Live cutover — flip demo → production.
#
# RUN ONLY AFTER:
#   - DocuSign has emailed the "Go Live approved" confirmation
#   - Rocket has granted production OAuth consent via account.docusign.com
#   - Rocket is online and ready to create the production Connect webhook
#
# This script:
#   1. Swaps DOCUSIGN_ACCOUNT_ID / DOCUSIGN_BASE_URL / DOCUSIGN_USER_ID in
#      .env.local from demo to production values (leaves demo as comments).
#   2. Pushes the same 3 vars to Vercel Production.
#   3. Triggers a fresh production deploy so the new env takes effect.

set -euo pipefail

PROD_ACCOUNT_ID="0bdc186c-ebb5-4a64-8a7c-d0f634a6e2eb"
PROD_BASE_URL="https://na3.docusign.net/restapi"
PROD_USER_ID="1186eefc-8bae-4658-b576-1775afcf5402"

DEMO_ACCOUNT_ID="ab721330-681b-4723-929f-08524c1ce04b"
DEMO_BASE_URL="https://demo.docusign.net/restapi"
DEMO_USER_ID="a1d63e27-a260-4875-aedb-5ac7590a229"

ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Run this from the project root." >&2
  exit 1
fi

echo "==> Backing up .env.local to .env.local.before-go-live"
cp "$ENV_FILE" "$ENV_FILE.before-go-live"

echo "==> Rewriting DocuSign vars in $ENV_FILE"
# macOS sed needs '' after -i. Each rewrite leaves the old value as a
# "DEMO value (kept for rollback)" comment for fast revert.
sed -i '' -E "
  s|^DOCUSIGN_ACCOUNT_ID=$DEMO_ACCOUNT_ID|DOCUSIGN_ACCOUNT_ID=$PROD_ACCOUNT_ID|
  s|^DOCUSIGN_BASE_URL=$DEMO_BASE_URL|DOCUSIGN_BASE_URL=$PROD_BASE_URL|
  s|^DOCUSIGN_USER_ID=$DEMO_USER_ID|DOCUSIGN_USER_ID=$PROD_USER_ID|
  s|^# PROD value \(waiting on Go Live approval\): 0bdc186c-ebb5-4a64-8a7c-d0f634a6e2eb|# DEMO value (kept for rollback): $DEMO_ACCOUNT_ID|
  s|^# PROD value \(waiting on Go Live approval\): https://na3.docusign.net/restapi|# DEMO value (kept for rollback): $DEMO_BASE_URL|
  s|^# PROD value \(waiting on Go Live approval\): 1186eefc-8bae-4658-b576-1775afcf5402|# DEMO value (kept for rollback): $DEMO_USER_ID|
" "$ENV_FILE"

echo "==> Verifying .env.local values"
grep -E "^DOCUSIGN_(ACCOUNT_ID|BASE_URL|USER_ID)=" "$ENV_FILE"

echo ""
echo "==> Updating Vercel Production env vars (3 vars)"
echo "    You may be prompted to log in if your session expired."

# Remove old prod values (ignore errors if they don't exist yet)
vercel env rm DOCUSIGN_ACCOUNT_ID production --yes 2>/dev/null || true
vercel env rm DOCUSIGN_BASE_URL  production --yes 2>/dev/null || true
vercel env rm DOCUSIGN_USER_ID   production --yes 2>/dev/null || true

# Add new prod values
printf '%s' "$PROD_ACCOUNT_ID" | vercel env add DOCUSIGN_ACCOUNT_ID production
printf '%s' "$PROD_BASE_URL"  | vercel env add DOCUSIGN_BASE_URL  production
printf '%s' "$PROD_USER_ID"   | vercel env add DOCUSIGN_USER_ID   production

echo ""
echo "==> Triggering production redeploy"
vercel --prod --yes

echo ""
echo "Cutover complete."
echo ""
echo "Remaining manual steps (Rocket has to do these):"
echo "  - Grant production OAuth consent:"
echo "    https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=01612a96-66a0-4806-84a0-6af7dd49d17e&redirect_uri=https://www.rocketrealty.properties/api/auth/docusign/callback"
echo "  - Create Connect webhook in the production DocuSign console:"
echo "    URL: https://www.rocketrealty.properties/api/webhooks/docusign"
echo "    HMAC auth using DOCUSIGN_CONNECT_HMAC_SECRET"
echo ""
echo "Smoke test after both: send a real envelope end-to-end."
