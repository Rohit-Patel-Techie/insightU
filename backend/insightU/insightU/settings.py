from pathlib import Path
import os

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-development-only-change-me")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in {"1", "true", "yes"}

ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if host.strip()]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'profiles.apps.ProfilesConfig',
    "checkin.apps.CheckinConfig",
    "habits.apps.HabitsConfig",
    "goals.apps.GoalsConfig",
    "journal.apps.JournalConfig",
    "analytics.apps.AnalyticsConfig",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",") if origin.strip()]

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

ROOT_URLCONF = 'insightU.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'insightU.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASE_URL = os.getenv("DATABASE_URL")
# print("DATABASE_URL:", os.getenv("DATABASE_URL"))
# print("\n",DATABASE_URL)
if DATABASE_URL:
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, conn_health_checks=True)}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'ai_reflection': os.getenv('AI_REFLECTION_RATE', '10/hour'),
        'ai_insight_generate': os.getenv('AI_INSIGHT_GENERATE_RATE', '60/hour'),
        'ai_insight_read': os.getenv('AI_INSIGHT_READ_RATE', '240/hour'),
    },
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

#For Email SMTP 
if os.environ.get('ENVIRONMENT') == 'production':
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'your-smtp-password')
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'no-reply@localhost.com'


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "").rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
ANALYTICS_VERSION = os.getenv("ANALYTICS_VERSION", "1.0")

# --- AI Insight upgrade (provider-neutral, OpenAI-compatible strict JSON) ----
# Dedicated short timeout for interactive structured insight generation. Kept
# separate from LLM_TIMEOUT_SECONDS (used by the legacy reflection adapter).
AI_INSIGHT_TIMEOUT_SECONDS = float(os.getenv("AI_INSIGHT_TIMEOUT_SECONDS", "3"))
# Optional dedicated model override for insight generation (falls back to LLM_MODEL).
AI_INSIGHT_MODEL = os.getenv("AI_INSIGHT_MODEL", "")
# Force-regeneration cap per user, per service, per rolling hour.
AI_INSIGHT_FORCE_MAX_PER_HOUR = int(os.getenv("AI_INSIGHT_FORCE_MAX_PER_HOUR", "3"))
# Rolling window (days) for pattern discovery, and reported-item caps.
AI_PATTERN_WINDOW_DAYS = int(os.getenv("AI_PATTERN_WINDOW_DAYS", "28"))
AI_PATTERN_MAX_ITEMS = int(os.getenv("AI_PATTERN_MAX_ITEMS", "7"))
AI_WEEKLY_MAX_ITEMS = int(os.getenv("AI_WEEKLY_MAX_ITEMS", "3"))
# Versioned one-time Journal AI consent.
JOURNAL_AI_CONSENT_VERSION = os.getenv("JOURNAL_AI_CONSENT_VERSION", "1")

# --- AI insight eligibility thresholds --------------------------------------
# Minimum reported days required for window-scoped services.
AI_PATTERN_MIN_REPORTED_DAYS = int(os.getenv("AI_PATTERN_MIN_REPORTED_DAYS", "7"))
AI_WEEKLY_MIN_REPORTED_DAYS = int(os.getenv("AI_WEEKLY_MIN_REPORTED_DAYS", "3"))

# --- Provider-neutral disclosure / privacy policy ---------------------------
AI_PROVIDER_NAME = os.getenv("AI_PROVIDER_NAME", "")
AI_PRIVACY_POLICY_URL = os.getenv("AI_PRIVACY_POLICY_URL", "")
AI_DATA_RETENTION = os.getenv("AI_DATA_RETENTION", "")
AI_PROVIDER_POLICY_VERSION = os.getenv("AI_PROVIDER_POLICY_VERSION", "1")

# --- Strict JSON output guards ----------------------------------------------
# Whether to request the provider's native JSON object mode (response_format).
AI_JSON_MODE = os.getenv("AI_JSON_MODE", "True").lower() in {"1", "true", "yes"}
# Per-string and total structured-output size caps (reject, never truncate).
AI_MAX_STRING_CHARS = int(os.getenv("AI_MAX_STRING_CHARS", "2000"))
AI_MAX_OUTPUT_BYTES = int(os.getenv("AI_MAX_OUTPUT_BYTES", "16384"))
# Hard cap on how many bytes are read from the provider HTTP response.
AI_MAX_RESPONSE_BYTES = int(os.getenv("AI_MAX_RESPONSE_BYTES", "65536"))
# Maximum journal content sent to the provider (reject, never truncate).
AI_JOURNAL_MAX_CONTENT_CHARS = int(os.getenv("AI_JOURNAL_MAX_CONTENT_CHARS", "8000"))
# HMAC key used to fingerprint raw journal content (falls back to SECRET_KEY).
AI_JOURNAL_HMAC_KEY = os.getenv("AI_JOURNAL_HMAC_KEY", "") or SECRET_KEY
