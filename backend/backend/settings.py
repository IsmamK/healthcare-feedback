"""Environment-based Django settings. Production configuration fails closed."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
PRODUCTION = os.environ.get("DJANGO_ENV", "development") == "production"


def required(name):
    value = os.environ.get(name, "")
    if not value.strip() or value.lower().startswith(("change-me", "replace-me")):
        raise ImproperlyConfigured(f"{name} must be configured")
    return value if name in {"DJANGO_SECRET_KEY", "POSTGRES_PASSWORD", "EMAIL_HOST_PASSWORD"} else value.strip()


def csv_env(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


SECRET_KEY = required("DJANGO_SECRET_KEY") if PRODUCTION else os.environ.get(
    "DJANGO_SECRET_KEY", "development-only-key-do-not-use-in-production"
)
if PRODUCTION and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith("django-insecure-")):
    raise ImproperlyConfigured("Use a newly generated DJANGO_SECRET_KEY of at least 50 characters")
DEBUG = not PRODUCTION and os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = csv_env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]" if not PRODUCTION else "")
if PRODUCTION and (not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS):
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must contain explicit hostnames")

INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "corsheaders", "rest_framework", "rest_framework.authtoken", "api",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "backend.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": [], "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request", "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "backend.wsgi.application"

if PRODUCTION:
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql", "NAME": required("POSTGRES_DB"),
        "USER": required("POSTGRES_USER"), "PASSWORD": required("POSTGRES_PASSWORD"),
        "HOST": required("POSTGRES_HOST"), "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60, "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {"connect_timeout": 5, "sslmode": os.environ.get("POSTGRES_SSLMODE", "prefer")},
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3",
                            "NAME": BASE_DIR / "db.sqlite3", "OPTIONS": {"timeout": 20}}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": f"django.contrib.auth.password_validation.{name}"}
    for name in ("UserAttributeSimilarityValidator", "MinimumLengthValidator",
                 "CommonPasswordValidator", "NumericPasswordValidator")
]
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.TokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAdminUser"],
}
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = csv_env("DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:5173" if not PRODUCTION else "")
CSRF_TRUSTED_ORIGINS = csv_env("DJANGO_CSRF_TRUSTED_ORIGINS")
FRONTEND_URL = required("FRONTEND_URL").rstrip("/") if PRODUCTION else os.environ.get("FRONTEND_URL", "http://localhost:5173")
if PRODUCTION and not FRONTEND_URL.startswith("https://"):
    raise ImproperlyConfigured("FRONTEND_URL must use HTTPS")

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("DJANGO_TIME_ZONE", "Asia/Dhaka")
USE_I18N = True
USE_TZ = True
STATIC_URL = "/backend/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
FORCE_SCRIPT_NAME = "/backend" if PRODUCTION else None
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if PRODUCTION else None
SECURE_SSL_REDIRECT = PRODUCTION
SECURE_REDIRECT_EXEMPT = [r"^(backend/)?health/(live|ready)/$"]
SESSION_COOKIE_SECURE = PRODUCTION
CSRF_COOKIE_SECURE = PRODUCTION
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000 if PRODUCTION else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
# Deliberately avoid asserting HTTPS policy for unverified child domains or requesting preload.
# Keep every other deployment warning fatal in the release check.
SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]
X_FRAME_OPTIONS = "DENY"

email_choice = required("EMAIL_ALERTS_ENABLED") if PRODUCTION else os.environ.get("EMAIL_ALERTS_ENABLED", "true")
if email_choice not in {"true", "false"}:
    raise ImproperlyConfigured("EMAIL_ALERTS_ENABLED must explicitly be true or false")
EMAIL_ALERTS_ENABLED = email_choice == "true"
REQUIRE_SMTP = PRODUCTION and EMAIL_ALERTS_ENABLED
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend" if REQUIRE_SMTP
    else "django.core.mail.backends.dummy.EmailBackend" if not EMAIL_ALERTS_ENABLED
    else "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = required("EMAIL_HOST") if REQUIRE_SMTP else os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "465"))
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "true").lower() == "true"
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "false").lower() == "true"
if EMAIL_USE_SSL and EMAIL_USE_TLS:
    raise ImproperlyConfigured("Choose either EMAIL_USE_SSL or EMAIL_USE_TLS")
EMAIL_HOST_USER = required("EMAIL_HOST_USER") if REQUIRE_SMTP else ""
EMAIL_HOST_PASSWORD = required("EMAIL_HOST_PASSWORD") if REQUIRE_SMTP else ""
DEFAULT_FROM_EMAIL = required("DEFAULT_FROM_EMAIL") if REQUIRE_SMTP else "webmaster@localhost"
LOW_RATING_EMAILS = csv_env("LOW_RATING_EMAILS")
if REQUIRE_SMTP and not LOW_RATING_EMAILS:
    raise ImproperlyConfigured("LOW_RATING_EMAILS must be configured")
EMAIL_TIMEOUT = 10
LOGGING = {
    "version": 1, "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
