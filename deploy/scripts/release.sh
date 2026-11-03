#!/usr/bin/env bash
# Run from an uploaded immutable release directory. Credentials remain in PROJECT_ROOT/env.
set -Eeuo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
load_site
RELEASE_DIR=$(realpath "${1:?Usage: release.sh /opt/healthcare-feedback/releases/id}")
[[ "$RELEASE_DIR" == "$PROJECT_ROOT"/releases/* && -f "$RELEASE_DIR/images.env" ]] || fail 'Invalid release bundle'
exec 9>"$PROJECT_ROOT/release.lock"
flock -w 1800 9
export DEPLOY_LOCK_HELD=1
[[ ! -e "$PROJECT_ROOT/transaction.pending" ]] || fail 'Interrupted release requires reconciliation; see deploy/README.md'
for file in backend.env database.env site.env; do
  [[ -s "$PROJECT_ROOT/env/$file" ]] || fail "Missing env/$file"
  mode=$(stat -c %a "$PROJECT_ROOT/env/$file")
  [[ "$mode" == 600 || "$mode" == 400 ]] || fail "Restrict env/$file to mode 600"
done
[[ $(df -Pm "$PROJECT_ROOT" | awk 'NR==2 {print $4}') -ge 3072 ]] || fail 'At least 3 GiB free disk is required before pulling release images'
[[ $(awk '/MemAvailable/ {print $2}' /proc/meminfo) -ge 262144 ]] || fail 'At least 256 MiB available RAM is required; inspect capacity before deployment'
old=$(readlink -f "$PROJECT_ROOT/current" || true)
# Images contain only immutable registry digests; metadata is never sourced as shell code.
python3 "$RELEASE_DIR/scripts/validate-release.py" "$RELEASE_DIR/images.env"
new_run=$(sed -n 's/^CI_RUN_ID=//p' "$RELEASE_DIR/images.env")
new_attempt=$(sed -n 's/^CI_RUN_ATTEMPT=//p' "$RELEASE_DIR/images.env")
new_sha=$(sed -n 's/^GIT_SHA=//p' "$RELEASE_DIR/images.env")
if [[ -n "$old" && -f "$old/images.env" ]]; then
  old_run=$(sed -n 's/^CI_RUN_ID=//p' "$old/images.env")
  old_attempt=$(sed -n 's/^CI_RUN_ATTEMPT=//p' "$old/images.env")
  (( new_run > old_run || (new_run == old_run && new_attempt > old_attempt) )) || fail 'Refusing out-of-order or already deployed workflow run'
fi
compose config --quiet
compose pull backend frontend
compose run --rm --no-deps backend python manage.py check --deploy --fail-level WARNING
# Validate the installed, project-only Nginx configuration before any DB or app changes.
python3 "$RELEASE_DIR/scripts/render-nginx.py" "$PROJECT_ROOT/env/site.env" tls >"$RELEASE_DIR/site.conf"
cmp --silent "$RELEASE_DIR/site.conf" /etc/nginx/conf.d/healthcare-feedback.conf \
  || fail 'Project Nginx configuration must be applied with configure-nginx.sh before this release'
changed_db=0
changed_apps=0
failed() {
  status=$?
  trap - ERR
  echo "Release failed (exit $status); no database is restored automatically" >&2
  if [[ -n "$old" && -d "$old" && "$changed_db" == 0 && "$changed_apps" == 1 ]]; then
    RELEASE_DIR=$old
    if compose up -d --no-deps --wait --wait-timeout 180 backend frontend && wait_local; then
      printf '%s application-rollback-ok\n' "$(date -u +%FT%TZ)" >>"$PROJECT_ROOT/logs/releases.log"
      rm -f "$PROJECT_ROOT/transaction.pending"
      echo 'Previous application release restored; failed release remains failed' >&2
    else
      echo 'Application rollback failed; manual recovery required' >&2
    fi
  elif [[ "$changed_db" == 0 && "$changed_apps" == 0 ]]; then
    rm -f "$PROJECT_ROOT/transaction.pending"
  else
    echo 'Reconcile transaction.pending before releasing again' >&2
  fi
  exit "$status"
}
trap failed ERR
printf '%s\n' "$RELEASE_DIR" >"$PROJECT_ROOT/transaction.pending"
# Existing database containers are not recreated. PostgreSQL major changes require a separate plan.
if [[ -z $(compose ps -q db) ]]; then
  compose up -d --wait --wait-timeout 120 db
else
  [[ $(docker inspect --format '{{.State.Health.Status}}' "$(compose ps -q db)") == healthy ]] || fail 'Existing project database is unhealthy'
fi
plan=$(compose run --rm -T --no-deps backend python manage.py deployment_plan)
pending=$(printf '%s' "$plan" | python3 -c 'import json,sys; print(int(json.load(sys.stdin)["pending"]))')
existing=$(printf '%s' "$plan" | python3 -c 'import json,sys; print(int(json.load(sys.stdin)["existing_schema"]))')
if [[ "$pending" != 0 ]]; then
  if [[ "$existing" == 0 ]]; then
    [[ "${INITIALIZE_EMPTY_DATABASE:-false}" == true ]] || fail 'Confirm initialization of a new database or import existing production data before proceeding'
  fi
  if [[ "$existing" == 1 ]]; then
    [[ -f "$PROJECT_ROOT/env/migration-approved-sha" ]] && \
      [[ $(cat "$PROJECT_ROOT/env/migration-approved-sha") == "$new_sha" ]] \
      || fail 'Pending migrations on an existing database require review and exact SHA approval'
  fi
  bash "$RELEASE_DIR/scripts/backup.sh" "$RELEASE_DIR"
  changed_db=1
  compose run --rm -T --no-deps backend python manage.py migrate --noinput
  if [[ "$existing" == 0 ]]; then
    compose run --rm -T --no-deps backend python manage.py populate_questions
    compose run --rm -T --no-deps backend python manage.py populate_doctors
  fi
fi
compose run --rm -T --no-deps backend python manage.py migrate --check
changed_apps=1
compose up -d --no-deps --wait --wait-timeout 180 backend frontend
wait_local
python3 "$RELEASE_DIR/scripts/verify.py" "$FRONTEND_DOMAIN" "$API_DOMAIN"
# Back up before promotion even when the release had no migrations.
bash "$RELEASE_DIR/scripts/backup.sh" "$RELEASE_DIR"
if [[ -n "$old" && -d "$old" ]]; then
  ln -s "$old" "$PROJECT_ROOT/previous.new"
  mv -Tf "$PROJECT_ROOT/previous.new" "$PROJECT_ROOT/previous"
fi
python3 "$RELEASE_DIR/scripts/manifest.py" "$RELEASE_DIR" >"$RELEASE_DIR/manifest.json.tmp"
mv "$RELEASE_DIR/manifest.json.tmp" "$RELEASE_DIR/manifest.json"
ln -s "$RELEASE_DIR" "$PROJECT_ROOT/current.new"
mv -Tf "$PROJECT_ROOT/current.new" "$PROJECT_ROOT/current"
cp "$RELEASE_DIR/images.env" "$PROJECT_ROOT/compose/image-tags.env.new"
mv "$PROJECT_ROOT/compose/image-tags.env.new" "$PROJECT_ROOT/compose/image-tags.env"
rm -f "$PROJECT_ROOT/transaction.pending"
printf '%s %s %s healthy\n' "$(date -u +%FT%TZ)" "$new_sha" "$new_run" >>"$PROJECT_ROOT/logs/releases.log"
trap - ERR
cat "$RELEASE_DIR/manifest.json"
