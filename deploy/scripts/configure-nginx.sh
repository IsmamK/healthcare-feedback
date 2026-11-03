#!/usr/bin/env bash
# Requires authorized sudo. Changes only this project's vhost and certificate.
set -Eeuo pipefail
umask 077
[[ $EUID == 0 ]] || { echo 'Run through authorized sudo' >&2; exit 1; }
release=$(realpath "${1:?Usage: configure-nginx.sh release-dir [http|tls|issue-cert]}")
[[ "$release" == /opt/healthcare-feedback/releases/* ]] || exit 1
mode=${2:-tls}
root=/opt/healthcare-feedback
target=/etc/nginx/conf.d/healthcare-feedback.conf
exec 8>"$root/nginx.lock"
flock -w 120 8
[[ ! -L "$target" ]] || { echo 'Unexpected symlink for project vhost' >&2; exit 1; }
if [[ "$mode" == issue-cert ]]; then
  [[ -f "$target" ]] || { echo 'Apply HTTP config first' >&2; exit 1; }
  # shellcheck source=/dev/null
  source "$root/env/site.env"
  args=(-d "$FRONTEND_DOMAIN")
  [[ "$API_DOMAIN" == "$FRONTEND_DOMAIN" ]] || args+=(-d "$API_DOMAIN")
  [[ -z "${WWW_DOMAIN:-}" ]] || args+=(-d "$WWW_DOMAIN")
  [[ "$CERTBOT_EMAIL" != *replace-me* && "$CERTBOT_EMAIL" == *@* ]] || exit 1
  certbot certonly --webroot -w "$root/data/acme" --cert-name healthcare-feedback \
    --non-interactive --agree-tos --email "$CERTBOT_EMAIL" "${args[@]}" \
    --deploy-hook 'nginx -t && systemctl reload nginx'
  exit 0
fi
tmp=$(mktemp "$root/nginx/candidate.XXXXXX")
trap 'rm -f "$tmp"' EXIT
python3 "$release/scripts/render-nginx.py" "$root/env/site.env" "$mode" >"$tmp"
[[ "$mode" != tls || -s /etc/letsencrypt/live/healthcare-feedback/fullchain.pem ]] || { echo 'Obtain certificate first' >&2; exit 1; }
backup="$root/nginx/previous.conf"
had_target=0
if [[ -f "$target" ]]; then cp -p "$target" "$backup"; had_target=1; fi
install -m 644 "$tmp" "$target.new"
mv -f "$target.new" "$target"
restore() {
  if [[ "$had_target" == 1 ]]; then cp -p "$backup" "$target"; else rm -f "$target"; fi
}
if ! nginx -t; then restore; echo 'Nginx validation failed; previous project config restored' >&2; exit 1; fi
if ! systemctl reload nginx; then
  restore
  nginx -t && systemctl reload nginx
  exit 1
fi
echo "Project Nginx configuration applied ($mode)"
