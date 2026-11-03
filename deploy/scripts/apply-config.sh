#!/usr/bin/env bash
# Apply SMTP/public URL/other app settings from the main .env without changing image versions.
set -Eeuo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
exec 9>"$PROJECT_ROOT/release.lock"
flock -w 1800 9
[[ ! -e "$PROJECT_ROOT/transaction.pending" ]] || fail 'Reconcile the pending release first'
RELEASE_DIR=$(readlink -f "$PROJECT_ROOT/current")
[[ "$RELEASE_DIR" == "$PROJECT_ROOT"/releases/* && -f "$RELEASE_DIR/manifest.json" ]] || fail 'Deploy a verified release first'
snapshot=$(mktemp -d "$PROJECT_ROOT/env/.apply.XXXXXX")
for name in backend database frontend site backup; do
  [[ ! -f "$PROJECT_ROOT/env/$name.env" ]] || cp -p "$PROJECT_ROOT/env/$name.env" "$snapshot/"
done
restart_attempted=0
failed() {
  result=$?
  trap - ERR
  cp -p "$snapshot/"*.env "$PROJECT_ROOT/env/"
  load_site
  if [[ "$restart_attempted" == 1 ]]; then
    compose up -d --no-deps --wait --wait-timeout 180 backend frontend && wait_local \
      || { echo "Configuration rollback needs manual recovery; snapshot: $snapshot" >&2; exit "$result"; }
  fi
  echo 'Configuration rejected; previous service configuration restored. Main .env remains unapplied for correction.' >&2
  exit "$result"
}
trap failed ERR
python3 "$RELEASE_DIR/scripts/sync-env.py"
load_site
python3 "$RELEASE_DIR/scripts/render-nginx.py" "$PROJECT_ROOT/env/site.env" tls >"$snapshot/candidate.conf"
cmp --silent "$snapshot/candidate.conf" /etc/nginx/conf.d/healthcare-feedback.conf \
  || fail 'Domain/port changes require authorized DNS, TLS and Nginx setup before applying'
compose config --quiet
compose run --rm -T --no-deps backend python manage.py check --deploy --fail-level WARNING
compose run --rm -T --no-deps backend python manage.py check_notifications
restart_attempted=1
compose up -d --no-deps --wait --wait-timeout 180 backend frontend
wait_local
python3 "$RELEASE_DIR/scripts/verify.py" "$FRONTEND_DOMAIN" "$API_DOMAIN"
printf '%s configuration-applied\n' "$(date -u +%FT%TZ)" >>"$PROJECT_ROOT/logs/releases.log"
trap - ERR
case "$snapshot" in "$PROJECT_ROOT"/env/.apply.*) rm -rf -- "$snapshot" ;; *) fail 'Unexpected snapshot path' ;; esac
echo 'Configuration applied and verified; image versions and database credentials preserved'
