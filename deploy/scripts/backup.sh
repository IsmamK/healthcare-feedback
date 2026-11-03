#!/usr/bin/env bash
set -Eeuo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
load_site
RELEASE_DIR=${1:-$(readlink -f "$PROJECT_ROOT/current")}
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$PROJECT_ROOT/release.lock"
  flock -w 1800 9
fi
[[ "$RELEASE_DIR" == "$PROJECT_ROOT"/releases/* ]] || fail 'Invalid release directory'
stamp=$(date -u +%Y%m%dT%H%M%S)-$$
backup="$PROJECT_ROOT/backups/$stamp.dump"
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$backup.tmp"
[[ -s "$backup.tmp" ]] || fail 'Empty database backup'
compose exec -T db pg_restore --list <"$backup.tmp" >/dev/null
mv "$backup.tmp" "$backup"
sha256sum "$backup" >"$backup.sha256"
case "${BACKUP_MODE:-}" in
  offsite)
    command -v restic >/dev/null || fail 'restic is required for offsite backups'
    [[ -r "$PROJECT_ROOT/env/backup.env" ]] || fail 'Missing env/backup.env'
    set -a
    # shellcheck source=/dev/null
    source "$PROJECT_ROOT/env/backup.env"
    set +a
    # Never initialize or prune an existing offsite repository automatically.
    restic backup --tag healthcare-feedback "$backup" "$backup.sha256" >/dev/null
    restic snapshots --latest 1 --tag healthcare-feedback >/dev/null
    ;;
  local-only-accepted) ;;
  *) fail 'Set a verified offsite policy or explicitly accept temporary local-only backups' ;;
esac
retention=${BACKUP_RETENTION_DAYS:-14}
[[ "$retention" =~ ^[0-9]+$ ]] && (( retention >= 1 )) || fail 'Invalid backup retention'
find "$PROJECT_ROOT/backups" -maxdepth 1 -type f \( -name '*.dump' -o -name '*.dump.sha256' \) -mtime "+$retention" -delete
printf '%s\n' "$backup" >"$PROJECT_ROOT/backups/latest"
echo "Verified backup: $backup ($BACKUP_MODE)"
