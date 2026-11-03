#!/usr/bin/env bash
# Deliberate application-only rollback. Never changes database schema/data.
set -Eeuo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
load_site
[[ "${1:-}" == --schema-compatible ]] || fail 'Review DB compatibility, then pass --schema-compatible'
exec 9>"$PROJECT_ROOT/release.lock"
flock -w 1800 9
[[ ! -e "$PROJECT_ROOT/transaction.pending" ]] || fail 'Reconcile pending transaction first'
RELEASE_DIR=$(readlink -f "$PROJECT_ROOT/previous")
[[ "$RELEASE_DIR" == "$PROJECT_ROOT"/releases/* && -f "$RELEASE_DIR/manifest.json" ]] || fail 'No verified previous release'
python3 "$RELEASE_DIR/scripts/validate-release.py" "$RELEASE_DIR/images.env"
old=$(readlink -f "$PROJECT_ROOT/current")
printf '%s\n' "$RELEASE_DIR" >"$PROJECT_ROOT/transaction.pending"
compose config --quiet
compose pull backend frontend
compose up -d --no-deps --wait --wait-timeout 180 backend frontend
wait_local
python3 "$RELEASE_DIR/scripts/verify.py" "$FRONTEND_DOMAIN" "$API_DOMAIN"
ln -s "$RELEASE_DIR" "$PROJECT_ROOT/current.new"
mv -Tf "$PROJECT_ROOT/current.new" "$PROJECT_ROOT/current"
ln -s "$old" "$PROJECT_ROOT/previous.new"
mv -Tf "$PROJECT_ROOT/previous.new" "$PROJECT_ROOT/previous"
cp "$RELEASE_DIR/images.env" "$PROJECT_ROOT/compose/image-tags.env.new"
mv "$PROJECT_ROOT/compose/image-tags.env.new" "$PROJECT_ROOT/compose/image-tags.env"
rm -f "$PROJECT_ROOT/transaction.pending"
printf '%s application-rollback %s\n' "$(date -u +%FT%TZ)" "$RELEASE_DIR" >>"$PROJECT_ROOT/logs/releases.log"
echo 'Application rollback verified; database unchanged'
