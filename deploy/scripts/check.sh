#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
for script in deploy/scripts/*.sh; do bash -n "$script"; done
python3 -m unittest discover -s deploy/tests -v
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary/env"
cp deploy/env/backend.env.example "$temporary/env/backend.env"
cp deploy/env/database.env.example "$temporary/env/database.env"
PROJECT_ROOT=$temporary BACKEND_PORT=18000 FRONTEND_PORT=18080 \
  BACKEND_IMAGE=example/backend@sha256:$(printf 'a%.0s' {1..64}) \
  FRONTEND_IMAGE=example/frontend@sha256:$(printf 'b%.0s' {1..64}) \
  docker compose --project-name healthcare-feedback-check -f deploy/compose.yml config --quiet
echo 'Shell syntax, release planning and Compose validation passed'
