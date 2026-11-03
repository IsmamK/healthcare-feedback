#!/usr/bin/env bash
# Shared helpers. Source only project-owned configuration.
set -Eeuo pipefail
umask 077
PROJECT_ROOT=${PROJECT_ROOT:-/opt/healthcare-feedback}
[[ "$PROJECT_ROOT" == /opt/healthcare-feedback ]] || { echo 'Unexpected project root' >&2; exit 1; }
export PROJECT_ROOT
export DOCKER_CONFIG="${HOME}/.docker-healthcare-feedback"
PROJECT=healthcare-feedback
fail() { echo "$*" >&2; exit 1; }
load_site() {
  [[ -r "$PROJECT_ROOT/env/site.env" ]] || fail 'Missing env/site.env'
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/env/site.env"
  export BACKEND_PORT FRONTEND_PORT
  for domain in "$FRONTEND_DOMAIN" "$API_DOMAIN"; do
    [[ "$domain" =~ ^[a-z0-9][a-z0-9.-]+[a-z0-9]$ && "$domain" != *replace-me* ]] || fail 'Invalid production domain'
  done
  for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
    [[ "$port" =~ ^[0-9]+$ ]] && (( port > 1024 && port < 65536 )) || fail 'Invalid loopback port'
  done
  [[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || fail 'Loopback ports must differ'
}
compose() {
  docker compose --project-name "$PROJECT" --env-file "$RELEASE_DIR/images.env" -f "$RELEASE_DIR/compose.yml" "$@"
}
wait_local() {
  curl --fail --silent --show-error --max-time 8 --retry 18 --retry-delay 3 --retry-all-errors \
    "http://127.0.0.1:${BACKEND_PORT}/health/ready/" >/dev/null
  curl --fail --silent --show-error --max-time 8 --retry 18 --retry-delay 3 --retry-all-errors \
    "http://127.0.0.1:${FRONTEND_PORT}/health/live/" >/dev/null
}
