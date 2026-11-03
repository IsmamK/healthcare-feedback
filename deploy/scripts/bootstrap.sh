#!/usr/bin/env bash
# Run as the deployment user after inspecting a shared host. Installs no global packages.
set -Eeuo pipefail
umask 077
root=/opt/healthcare-feedback
for tool in docker curl flock python3 sha256sum; do command -v "$tool" >/dev/null; done
docker compose version >/dev/null
docker info >/dev/null
[[ ! -L "$root" ]] || { echo 'Project root must not be a symlink' >&2; exit 1; }
if [[ ! -d "$root" ]]; then
  sudo install -d -m 750 -o "$(id -un)" -g "$(id -gn)" "$root"
fi
[[ -O "$root" ]] || { echo 'Project directory must belong to deployment user' >&2; exit 1; }
for directory in compose env data data/postgres nginx scripts backups logs releases; do
  mkdir -p "$root/$directory"
done
mkdir -p "$root/data/acme"
chmod 755 "$root" "$root/data" "$root/data/acme"
chmod 700 "$root/env" "$root/backups"
mkdir -p "$HOME/.docker-healthcare-feedback"
chmod 700 "$HOME/.docker-healthcare-feedback"
echo 'Project directories ready. No existing apps, firewall rules, packages or secrets changed.'
