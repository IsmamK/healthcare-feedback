#!/usr/bin/env bash
# Replace only this project's marked user-crontab entry.
set -Eeuo pipefail
umask 077
root=/opt/healthcare-feedback
[[ -f "$root/current/manifest.json" ]] || { echo 'Deploy a verified release first' >&2; exit 1; }
temporary=$(mktemp)
trap 'rm -f "$temporary"' EXIT
{ crontab -l 2>/dev/null || true; } | \
  sed '/^# BEGIN healthcare-feedback backup$/,/^# END healthcare-feedback backup$/d' >"$temporary"
cat >>"$temporary" <<'CRON'
# BEGIN healthcare-feedback backup
17 2 * * * /bin/bash /opt/healthcare-feedback/current/scripts/backup.sh >>/opt/healthcare-feedback/logs/backups.log 2>&1
# END healthcare-feedback backup
CRON
crontab "$temporary"
echo 'Project backup scheduled daily at 02:17 in the VPS timezone'
