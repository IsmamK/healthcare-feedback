"""Compile one protected .env into least-privilege per-service files; never print values."""
import os
import re
import shlex
import tempfile
from pathlib import Path

SITE_KEYS = {
    "FRONTEND_DOMAIN", "API_DOMAIN", "WWW_DOMAIN", "BACKEND_PORT", "FRONTEND_PORT",
    "CERTBOT_EMAIL", "CERTBOT_WITHOUT_EMAIL", "BACKUP_MODE", "BACKUP_RETENTION_DAYS", "INITIALIZE_EMPTY_DATABASE",
}
DB_KEYS = {"POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"}
BACKEND_KEYS = {
    "DJANGO_SECRET_KEY", "DJANGO_TIME_ZONE", "DJANGO_ALLOWED_HOSTS", "DJANGO_CORS_ALLOWED_ORIGINS",
    "DJANGO_CSRF_TRUSTED_ORIGINS", "FRONTEND_URL", "POSTGRES_SSLMODE", "EMAIL_ALERTS_ENABLED",
    "EMAIL_HOST", "EMAIL_PORT", "EMAIL_USE_SSL", "EMAIL_USE_TLS", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD",
    "DEFAULT_FROM_EMAIL", "LOW_RATING_EMAILS",
}
FRONTEND_KEYS = {"PUBLIC_API_URL", "PUBLIC_BULK_SMS_API_URL"}
BACKUP_KEYS = {
    "RESTIC_REPOSITORY", "RESTIC_PASSWORD_FILE", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_REGION",
    "B2_ACCOUNT_ID", "B2_ACCOUNT_KEY", "AZURE_ACCOUNT_NAME", "AZURE_ACCOUNT_KEY",
}
ALLOWED = SITE_KEYS | DB_KEYS | BACKEND_KEYS | FRONTEND_KEYS | BACKUP_KEYS


def parse(text):
    result = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or key not in ALLOWED or key in result or any(ord(char) < 32 for char in value):
            raise ValueError("Invalid, duplicate or unknown .env key; use deploy/.env.example")
        result[key] = value
    return result


def render(values):
    data = {
        "WWW_DOMAIN": "", "BACKEND_PORT": "18000", "FRONTEND_PORT": "18080", "DJANGO_TIME_ZONE": "Asia/Dhaka",
        "EMAIL_PORT": "465", "EMAIL_USE_SSL": "true", "EMAIL_USE_TLS": "false", "POSTGRES_SSLMODE": "prefer",
        "CERTBOT_WITHOUT_EMAIL": "false", "CERTBOT_EMAIL": "", "BACKUP_RETENTION_DAYS": "14",
        "INITIALIZE_EMPTY_DATABASE": "false", "PUBLIC_API_URL": "/backend/api/",
        "PUBLIC_BULK_SMS_API_URL": "https://bulksmsbd.net/api/smsapi", **values,
    }

    def required(key):
        value = data.get(key, "")
        if not value or "replace-me" in value:
            raise ValueError(f"Required production field missing: {key}")
        return value

    front = required("FRONTEND_DOMAIN")
    data["API_DOMAIN"] = data.get("API_DOMAIN") or front
    for key in ("FRONTEND_DOMAIN", "API_DOMAIN", "WWW_DOMAIN"):
        if data[key] and not re.fullmatch(r"[a-z0-9][a-z0-9.-]+[a-z0-9]", data[key]):
            raise ValueError(f"Invalid hostname: {key}")
    for key in ("BACKEND_PORT", "FRONTEND_PORT"):
        if not data[key].isdigit() or not 1024 < int(data[key]) < 65536:
            raise ValueError(f"Invalid port: {key}")
    if data["BACKEND_PORT"] == data["FRONTEND_PORT"]:
        raise ValueError("Frontend/backend ports must differ")
    for key in ("EMAIL_ALERTS_ENABLED", "EMAIL_USE_SSL", "EMAIL_USE_TLS", "CERTBOT_WITHOUT_EMAIL", "INITIALIZE_EMPTY_DATABASE"):
        if data.get(key) not in {"true", "false"}:
            raise ValueError(f"Explicit true/false required: {key}")
    if len(required("DJANGO_SECRET_KEY")) < 50 or len(required("POSTGRES_PASSWORD")) < 24:
        raise ValueError("Generate strong Django/database secrets")
    for key in ("POSTGRES_DB", "POSTGRES_USER"):
        if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", required(key)):
            raise ValueError(f"Invalid PostgreSQL identifier: {key}")
    hosts = list(dict.fromkeys((front, data["API_DOMAIN"], "localhost", "127.0.0.1")))
    data["DJANGO_ALLOWED_HOSTS"] = data.get("DJANGO_ALLOWED_HOSTS") or ",".join(hosts)
    data["DJANGO_CORS_ALLOWED_ORIGINS"] = data.get("DJANGO_CORS_ALLOWED_ORIGINS") or f"https://{front}"
    data["DJANGO_CSRF_TRUSTED_ORIGINS"] = data.get("DJANGO_CSRF_TRUSTED_ORIGINS") or f"https://{front}"
    data["FRONTEND_URL"] = data.get("FRONTEND_URL") or f"https://{front}"
    if data["EMAIL_USE_SSL"] == data["EMAIL_USE_TLS"] == "true":
        raise ValueError("Choose SSL or STARTTLS, not both")
    if data["EMAIL_ALERTS_ENABLED"] == "true":
        for key in ("EMAIL_HOST", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD", "DEFAULT_FROM_EMAIL", "LOW_RATING_EMAILS"):
            required(key)
    if not data["EMAIL_PORT"].isdigit() or not 0 < int(data["EMAIL_PORT"]) < 65536:
        raise ValueError("Invalid SMTP port")
    if data["CERTBOT_WITHOUT_EMAIL"] != "true" and "@" not in required("CERTBOT_EMAIL"):
        raise ValueError("A certificate contact email or explicit no-email choice is required")
    if data.get("BACKUP_MODE") not in {"offsite", "local-only-accepted"}:
        raise ValueError("Choose an explicit backup policy")
    if not data["BACKUP_RETENTION_DAYS"].isdigit() or int(data["BACKUP_RETENTION_DAYS"]) < 1:
        raise ValueError("Backup retention must be positive")
    if data["BACKUP_MODE"] == "offsite":
        required("RESTIC_REPOSITORY")
        required("RESTIC_PASSWORD_FILE")
    for key in FRONTEND_KEYS:
        url = data[key]
        if not re.fullmatch(r"(?:/|https://)[A-Za-z0-9_:/.-]+", url):
            raise ValueError(f"Invalid public API URL: {key}")
    if not data["PUBLIC_API_URL"].endswith("/api/"):
        raise ValueError("PUBLIC_API_URL must end in /api/")

    def contents(keys, shell=False):
        return "".join(f"{key}={shlex.quote(data.get(key, '')) if shell else data.get(key, '')}\n" for key in sorted(keys))

    return {
        "backend.env": contents(BACKEND_KEYS), "database.env": contents(DB_KEYS),
        "frontend.env": contents(FRONTEND_KEYS), "site.env": contents(SITE_KEYS, shell=True),
        "backup.env": contents({key for key in BACKUP_KEYS if data.get(key)}, shell=True),
    }


def main():
    root = Path("/opt/healthcare-feedback")
    source = root / ".env"
    if source.is_symlink() or source.stat().st_mode & 0o077:
        raise ValueError("Main .env must be a regular protected file with mode 600")
    files = render(parse(source.read_text()))
    previous = root / "env/database.env"
    if previous.exists() and previous.read_text().splitlines() != files["database.env"].splitlines():
        old = dict(line.split("=", 1) for line in previous.read_text().splitlines() if line and not line.startswith("#"))
        new = dict(line.split("=", 1) for line in files["database.env"].splitlines())
        if old != new:
            raise ValueError("Database credentials changed; perform a deliberate DB rotation/import plan first")
    for name, content in files.items():
        path = root / "env" / name
        if path.exists() and path.read_text() == content:
            continue
        descriptor, temporary = tempfile.mkstemp(dir=root / "env", prefix=f".{name}.")
        with os.fdopen(descriptor, "w") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    print("Main .env validated; protected per-service configuration synchronized")


if __name__ == "__main__":
    main()
