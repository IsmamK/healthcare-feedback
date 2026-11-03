#!/bin/sh
set -eu
: "${PUBLIC_API_URL:=/backend/api/}"
: "${PUBLIC_BULK_SMS_API_URL:=https://bulksmsbd.net/api/smsapi}"
for url in "$PUBLIC_API_URL" "$PUBLIC_BULK_SMS_API_URL"; do
  case "$url" in /*|https://*) ;; *) echo 'Public API URLs must be relative or HTTPS' >&2; exit 1 ;; esac
  if printf '%s' "$url" | LC_ALL=C grep -q '[^A-Za-z0-9_:/.-]'; then
    echo 'Unsupported character in public API URL' >&2
    exit 1
  fi
done
printf 'window.__APP_CONFIG__ = {"API_URL":"%s","BULK_SMS_API_URL":"%s"};\n' \
  "$PUBLIC_API_URL" "$PUBLIC_BULK_SMS_API_URL" > /tmp/healthcare-feedback-config.js
