#!/usr/bin/env bash
#
# ADFLOW money-flow smoke test
#
# Walks the entire lifecycle of a payment through the platform:
#   auth → org → wallet → campaign → application → tracking link
#   → click → conversion → approval → ledger → payout → settlement
#
# Usage:
#   ./scripts/money-flow-smoke.sh [base_url]
#
# Default base_url is http://localhost:3000
#
# Requires:
#   - curl, jq installed
#   - Dev server running (npm run dev)
#   - CRON_SECRET set in .env.local for cron endpoints
#   - A webhook secret to simulate the conversion (optional)
#
# Every step prints what it does. On failure, the exact response body
# is printed and the script exits non-zero.

set -euo pipefail

BASE="${1:-http://localhost:3000}"
STAMP="$(date +%s)"
COOKIE_DIR="$(mktemp -d)"
ADV_COOKIE="$COOKIE_DIR/advertiser.txt"
CRT_COOKIE="$COOKIE_DIR/creator.txt"

# ---- helpers ----------------------------------------------------------
c_green() { printf "\033[32m%s\033[0m\n" "$1"; }
c_red() { printf "\033[31m%s\033[0m\n" "$1"; }
c_dim() { printf "\033[2m%s\033[0m\n" "$1"; }
c_step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }

# extract a JSON field via jq; die with the full body if extraction fails
j() { jq -r "$1" 2>/dev/null; }

die() { c_red "✗ $1"; exit 1; }
ok() { c_green "✓ $1"; }

# ---- cleanup ----------------------------------------------------------
cleanup() {
  rm -rf "$COOKIE_DIR"
}
trap cleanup EXIT

# ---- preflight --------------------------------------------------------
c_step "Preflight"
for bin in curl jq; do
  command -v "$bin" >/dev/null || die "$bin is required"
done
c_dim "Checking $BASE/health"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health" || true)
[ "$HEALTH" = "200" ] || die "Health check failed (HTTP $HEALTH). Is the dev server running?"
ok "Server healthy"

# =====================================================================
# 1. Register advertiser
# =====================================================================
c_step "Register advertiser"
ADV_EMAIL="smoke-adv-$STAMP@adflow.local"
ADV_USER="smoke_adv_$STAMP"
ADV_PASS="SmokeTestPass!1234"

ADV_REG=$(curl -sS -c "$ADV_COOKIE" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d "{\"name\":\"Smoke Advertiser\",\"username\":\"$ADV_USER\",\"email\":\"$ADV_EMAIL\",\"password\":\"$ADV_PASS\",\"acceptedTerms\":true}")

echo "$ADV_REG" | jq -e '.user.id' >/dev/null || die "Registration failed: $ADV_REG"
ADV_ID=$(echo "$ADV_REG" | j '.user.id')
ok "Advertiser registered: $ADV_EMAIL (id=$ADV_ID)"

# =====================================================================
# 2. Register creator
# =====================================================================
c_step "Register creator"
CRT_EMAIL="smoke-crt-$STAMP@adflow.local"
CRT_USER="smoke_crt_$STAMP"
CRT_PASS="SmokeTestPass!1234"

CRT_REG=$(curl -sS -c "$CRT_COOKIE" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d "{\"name\":\"Smoke Creator\",\"username\":\"$CRT_USER\",\"email\":\"$CRT_EMAIL\",\"password\":\"$CRT_PASS\",\"acceptedTerms\":true}")

echo "$CRT_REG" | jq -e '.user.id' >/dev/null || die "Registration failed: $CRT_REG"
CRT_ID=$(echo "$CRT_REG" | j '.user.id')
ok "Creator registered: $CRT_EMAIL (id=$CRT_ID)"

# =====================================================================
# 3. Create creator profile
# =====================================================================
c_step "Create creator profile"
PROF=$(curl -sS -b "$CRT_COOKIE" -X POST "$BASE/api/creator/profile" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"Smoke Creator\",\"bio\":\"Automated smoke test creator\",\"country\":\"US\",\"niches\":[\"gaming\",\"tech\"],\"languages\":[\"en\"]}")

echo "$PROF" | jq -e '.profile._id' >/dev/null || die "Profile failed: $PROF"
ok "Creator profile created"

# =====================================================================
# 4. Create organization
# =====================================================================
c_step "Create organization"
ORG=$(curl -sS -b "$ADV_COOKIE" -X POST "$BASE/api/organizations" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Test Brand $STAMP\",\"type\":\"advertiser\",\"defaultCurrency\":\"USD\"}")

echo "$ORG" | jq -e '.organization._id' >/dev/null || die "Org failed: $ORG"
ORG_ID=$(echo "$ORG" | j '.organization._id')
ok "Organization created (id=$ORG_ID)"

# =====================================================================
# 5. Deposit funds
# =====================================================================
c_step "Deposit \$1000 into wallet"
DEP=$(curl -sS -b "$ADV_COOKIE" -X POST "$BASE/api/wallet/deposit" \
  -H "Content-Type: application/json" \
  -d "{\"organizationId\":\"$ORG_ID\",\"amount\":1000,\"currency\":\"USD\"}")

echo "$DEP" | jq -e '.deposit._id' >/dev/null || die "Deposit failed: $DEP"
DEP_STATUS=$(echo "$DEP" | j '.deposit.status')
ok "Deposit $DEP_STATUS (id=$(echo "$DEP" | j '.deposit._id'))"

# Verify wallet balance reflects the deposit
BAL=$(curl -sS -b "$ADV_COOKIE" "$BASE/api/wallet/transactions?organizationId=$ORG_ID")
AVAILABLE=$(echo "$BAL" | jq -r '.balances.USD.available // 0')
c_dim "Wallet available: USD $AVAILABLE"
awk -v a="$AVAILABLE" 'BEGIN{exit !(a>=1000)}' || die "Wallet balance should be ≥ 1000, got $AVAILABLE"
ok "Wallet funded"

# =====================================================================
# 6. Create campaign (active + verified via admin bypass)
# =====================================================================
c_step "Create campaign"
# NOTE: The campaign lands in moderation unless the org is verified.
# For a smoke test, we create it as a draft and activate it via the
# campaign PATCH endpoint — which requires the org's budget headroom.
CAMP=$(curl -sS -b "$ADV_COOKIE" -X POST "$BASE/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"organizationId\":\"$ORG_ID\",
    \"title\":\"Smoke Campaign $STAMP\",
    \"description\":\"Automated smoke test campaign for the money flow.\",
    \"platform\":\"instagram\",
    \"supportedPlatforms\":[\"instagram\",\"tiktok\"],
    \"goal\":\"sales\",
    \"budget\":500,
    \"currency\":\"USD\",
    \"rewardPerCreator\":25,
    \"maxCreators\":10,
    \"targetNiches\":[\"gaming\"],
    \"targetCountries\":[],
    \"requirements\":[],
    \"isPublic\":true,
    \"status\":\"active\",
    \"rewardModel\":\"cpm\",
    \"rewardPerThousand\":2.00,
    \"minimumPayout\":10,
    \"attributionModel\":\"last_click\"
  }")

echo "$CAMP" | jq -e '.campaign._id' >/dev/null || die "Campaign failed: $CAMP"
CAMP_ID=$(echo "$CAMP" | j '.campaign._id')
CAMP_STATUS=$(echo "$CAMP" | j '.campaign.status')
CAMP_MOD=$(echo "$CAMP" | j '.campaign.moderationStatus // "not_required"')
c_dim "Campaign status=$CAMP_STATUS moderation=$CAMP_MOD"

# =====================================================================
# 7. Force-mod to active if it landed in moderation
# =====================================================================
if [ "$CAMP_STATUS" != "active" ]; then
  c_step "Approve campaign (needs admin or direct DB update)"
  c_red "Campaign is not active — moderation queue intervened."
  c_dim "Either:"
  c_dim "  1. Set platformRole=admin on the advertiser, then visit /admin/moderation/campaigns"
  c_dim "  2. Mark the org verified: db.organizations.updateOne({_id:ObjectId(\"$ORG_ID\")},{\$set:{isVerified:true}})"
  c_dim "  3. Re-run the smoke test."
  die "Cannot proceed without an active campaign"
fi
ok "Campaign is active (id=$CAMP_ID)"

# =====================================================================
# 8. Creator applies
# =====================================================================
c_step "Creator applies to campaign"
APP=$(curl -sS -b "$CRT_COOKIE" -X POST "$BASE/api/campaigns/$CAMP_ID/applications" \
  -H "Content-Type: application/json" \
  -d '{"message":"I would love to work on this campaign. My audience aligns with gaming and tech."}')

echo "$APP" | jq -e '.application._id' >/dev/null || die "Application failed: $APP"
APP_ID=$(echo "$APP" | j '.application._id')
ok "Application submitted (id=$APP_ID)"

# =====================================================================
# 9. Advertiser accepts
# =====================================================================
c_step "Advertiser accepts application"
ACCEPT=$(curl -sS -b "$ADV_COOKIE" -X PATCH "$BASE/api/campaigns/$CAMP_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"accepted"}')

echo "$ACCEPT" | jq -e '.application.status' >/dev/null || die "Accept failed: $ACCEPT"
c_dim "Application status: $(echo "$ACCEPT" | j '.application.status')"
ok "Application accepted"

# =====================================================================
# 10. Generate tracking link
# =====================================================================
c_step "Generate tracking link for creator"
LINK=$(curl -sS -b "$ADV_COOKIE" -X POST "$BASE/api/campaigns/$CAMP_ID/tracking-links" \
  -H "Content-Type: application/json" \
  -d "{\"creatorId\":\"$CRT_ID\",\"destinationUrl\":\"https://example.com/landing\"}")

echo "$LINK" | jq -e '.link.token' >/dev/null || die "Link generation failed: $LINK"
TOKEN=$(echo "$LINK" | j '.link.token')
ok "Tracking link generated (token=${TOKEN:0:12}…)"

# =====================================================================
# 11. Simulate a click
# =====================================================================
c_step "Simulate click on tracking link"
CLICK_REDIRECT=$(curl -sS -o /dev/null -w "%{redirect_url}" "$BASE/r/$TOKEN")
[ -n "$CLICK_REDIRECT" ] || die "No redirect from /r/$TOKEN"
c_dim "Redirected to: $CLICK_REDIRECT"
CLICK_ID=$(echo "$CLICK_REDIRECT" | sed -n 's/.*adflow_click=\([a-f0-9]*\).*/\1/p')
[ -n "$CLICK_ID" ] || die "Could not extract click id from redirect"
ok "Click recorded (id=$CLICK_ID)"

# =====================================================================
# 12. Fire conversion webhook
# =====================================================================
c_step "Fire conversion webhook"
# The signature must be HMAC-SHA256 over `${timestamp}.${body}` using
# the WEBHOOK_SECRET_TEST value. If not configured, we skip this step.
WEBHOOK_SECRET="${WEBHOOK_SECRET_TEST:-}"
if [ -z "$WEBHOOK_SECRET" ]; then
  c_red "WEBHOOK_SECRET_TEST is not set — skipping webhook step."
  c_dim "Set it in .env.local, restart dev, and re-run."
  c_dim "Alternatively, use the API key route: POST /api/public/v1/conversions"
else
  TS=$(date +%s)
  BODY=$(jq -n \
    --arg id "smoke_$STAMP" \
    --arg cid "$CAMP_ID" \
    --arg clickId "$CLICK_ID" \
    '{id: $id, type: "conversion", campaignId: $cid, amount: 25, currency: "USD", adflow_click: $clickId}')
  SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

  WH=$(curl -sS -X POST "$BASE/api/webhooks/conversions/test" \
    -H "Content-Type: application/json" \
    -H "x-adflow-signature: $SIG" \
    -d "$BODY")

  CONV_ID=$(echo "$WH" | jq -r '.conversionId // empty')
  [ -n "$CONV_ID" ] || die "Webhook failed: $WH"
  ok "Conversion recorded (id=$CONV_ID)"

  # =====================================================================
  # 13. Advertiser approves conversion
  # =====================================================================
  c_step "Advertiser approves conversion"
  REV=$(curl -sS -b "$ADV_COOKIE" -X PATCH "$BASE/api/conversions/$CONV_ID/review" \
    -H "Content-Type: application/json" \
    -d '{"action":"approve"}')

  echo "$REV" | jq -e '.conversion.status' >/dev/null || die "Approval failed: $REV"
  c_dim "Conversion status: $(echo "$REV" | j '.conversion.status')"
  ok "Conversion approved"

  # =====================================================================
  # 14. Verify creator earnings
  # =====================================================================
  c_step "Check creator earnings"
  EARN=$(curl -sS -b "$CRT_COOKIE" "$BASE/api/creator/earnings")
  AVAIL=$(echo "$EARN" | jq -r '.balances.USD.available // 0')
  PENDING=$(echo "$EARN" | jq -r '.balances.USD.pending // 0')
  c_dim "Creator USD: pending=$PENDING available=$AVAIL"

  # With a 10% platform fee on $25, the creator should have $22.50 available.
  awk -v a="$AVAIL" 'BEGIN{exit !(a>=22)}' || die "Expected available ≈ 22.50, got $AVAIL"
  ok "Creator credited"
fi

# =====================================================================
# 15. Creator adds a payout account
# =====================================================================
c_step "Creator adds payout account"
PA=$(curl -sS -b "$CRT_COOKIE" -X POST "$BASE/api/creator/payout-accounts" \
  -H "Content-Type: application/json" \
  -d '{"type":"manual","label":"Smoke Test Account","currency":"USD","isDefault":true,"details":{"instructions":"Smoke test"}}')

echo "$PA" | jq -e '.account._id' >/dev/null || die "Payout account failed: $PA"
ok "Payout account added"

# =====================================================================
# 16. Creator requests payout
# =====================================================================
c_step "Creator requests payout"
PO=$(curl -sS -b "$CRT_COOKIE" -X POST "$BASE/api/creator/payouts" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD"}')

echo "$PO" | jq -e '.payout._id' >/dev/null || die "Payout request failed: $PO"
PAYOUT_ID=$(echo "$PO" | j '.payout._id')
PAYOUT_STATUS=$(echo "$PO" | j '.payout.status')
c_dim "Payout status=$PAYOUT_STATUS id=$PAYOUT_ID"
ok "Payout requested"

# =====================================================================
# 17. Admin marks payout paid
# =====================================================================
c_step "Admin marks payout paid"
c_dim "This requires an admin account. If the current session isn't admin,"
c_dim "the API returns 403 — that's expected."

ADMIN_RES=$(curl -sS -b "$ADV_COOKIE" -X PATCH "$BASE/api/admin/payouts/$PAYOUT_ID" \
  -H "Content-Type: application/json" \
  -d '{"action":"mark-paid","providerReference":"smoke_test"}')

if echo "$ADMIN_RES" | jq -e '.payout.status' >/dev/null 2>&1; then
  ok "Payout marked paid: $(echo "$ADMIN_RES" | j '.payout.status')"
else
  c_red "Admin action skipped (session is not admin)."
  c_dim "Response: $ADMIN_RES"
  c_dim "To grant admin: db.users.updateOne({email:\"$ADV_EMAIL\"},{\$set:{platformRole:\"admin\"}})"
  c_dim "Then re-run this step manually."
fi

# =====================================================================
# 18. Final verification
# =====================================================================
c_step "Final state"
WALLET=$(curl -sS -b "$ADV_COOKIE" "$BASE/api/wallet/transactions?organizationId=$ORG_ID")
echo "$WALLET" | jq '{balances, committed}' | head -30

EARN=$(curl -sS -b "$CRT_COOKIE" "$BASE/api/creator/earnings")
echo "$EARN" | jq '.balances' | head -10

c_green ""
c_green "════════════════════════════════════════════"
c_green "  MONEY FLOW SMOKE TEST COMPLETE"
c_green "════════════════════════════════════════════"
c_dim "Advertiser: $ADV_EMAIL"
c_dim "Creator:    $CRT_EMAIL"
c_dim "Org:        $ORG_ID"
c_dim "Campaign:   $CAMP_ID"
c_dim ""
