#!/usr/bin/env bash
# Restores only into a temporary, isolated container, never the live database.
set -Eeuo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
exec 9>"$PROJECT_ROOT/release.lock"
flock -w 1800 9
backup=${1:-$(cat "$PROJECT_ROOT/backups/latest")}
[[ "$backup" == "$PROJECT_ROOT"/backups/*.dump && -f "$backup" ]] || fail 'Select a project backup'
sha256sum --check "$backup.sha256" >/dev/null
name="healthcare-feedback-restore-test-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# No network access, host ports or live volumes. tmpfs is discarded on exit.
docker run -d --name "$name" --network none --memory 384m \
  --tmpfs /var/lib/postgresql/data --env POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:17-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5 >/dev/null
for attempt in {1..40}; do
  if docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec "$name" createdb -U postgres restore_test
docker exec -i "$name" pg_restore -U postgres -d restore_test --no-owner --no-acl --exit-on-error <"$backup"
docker exec "$name" psql -U postgres -d restore_test -v ON_ERROR_STOP=1 \
  -c 'SELECT count(*) FROM django_migrations;' -c 'SELECT count(*) FROM api_feedbackresponse;' >/dev/null
date -u +%FT%TZ >"$PROJECT_ROOT/backups/last-restore-test"
echo 'Isolated database restore test passed'
