#!/bin/bash
# Push all 3 games to itch.io as HTML5 projects via butler.
#
# Prerequisites:
#   1. Butler CLI already installed at tools/butler.
#   2. Export BUTLER_API_KEY from https://itch.io/user/settings/api-keys
#      Example: export BUTLER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   3. Set ITCH_USER to your itch username (defaults to dmishra2022).
#
# This script will:
#   - For each game, push its itch-flavored ZIP to <user>/<game>:html5.
#   - Butler auto-creates the itch project as an unlisted draft on first push.
#   - You can then go to https://itch.io/game/edit/<slug> to add cover art,
#     screenshots, description, pricing (set to "No payments"), and publish.
#
# Idempotent: re-running produces incremental delta-patched builds.
set -euo pipefail

cd "$(dirname "$0")/.."

: "${BUTLER_API_KEY:?Set BUTLER_API_KEY from https://itch.io/user/settings/api-keys}"
ITCH_USER="${ITCH_USER:-dmishra2022}"
BUTLER="./tools/butler"
ARTIFACTS="submission-artifacts"
VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%Y.%m.%d-%H%M)"

for slug in neon-plinko neon-survivor tank-commander; do
  zip="$ARTIFACTS/${slug}-itch.zip"
  if [ ! -f "$zip" ]; then
    echo "SKIP $slug (missing $zip)"
    continue
  fi
  target="$ITCH_USER/$slug:html5"
  echo
  echo "===================================================="
  echo "Pushing $slug → $target  (version $VERSION)"
  echo "===================================================="
  "$BUTLER" push \
    --userversion "$VERSION" \
    --fix-permissions \
    --assume-yes \
    "$zip" \
    "$target"
done

echo
echo "All games pushed. Visit https://itch.io/dashboard to:"
echo "  1. For each game, open 'Edit game'"
echo "  2. Set Kind: HTML, uploaded ZIP already attached as html5 channel"
echo "  3. Tick 'This file will be played in the browser'"
echo "  4. Set viewport: see docs/SCREENSHOTS-MAP.md for cover 630×500"
echo "  5. Upload screenshots from submission-artifacts/screenshots/"
echo "  6. Fill description from docs/PORTAL-PASTE-KIT.md"
echo "  7. Set pricing to 'No payments' and visibility to Public"
