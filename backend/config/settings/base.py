import os
import re
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env files (backend/.env or root/.env)
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'local-development-secret-key-bloodchain-2026')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',

    # Local apps
    'apps.accounts',
    'apps.facilities',
    'apps.inventory',
    'apps.forecasting',
    'apps.transfers',
    'apps.audit',
    'apps.simulations',
    'apps.notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration: SQLite local default, PostgreSQL/Neon ready via DATABASE_URL
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip().strip("'\"")

# Extract postgresql:// URL if wrapped in `psql 'postgresql://...'` or extra quotes
match = re.search(r'(postgres(?:ql)?://[^\s\'"]+)', DATABASE_URL)
if match:
    DATABASE_URL = match.group(1)

if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = 'postgresql://' + DATABASE_URL[11:]
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100
}

# CORS configuration
CORS_ALLOW_ALL_ORIGINS = True

# FastAPI ML Service Integration URL
ML_SERVICE_URL = os.environ.get('ML_SERVICE_URL', 'http://127.0.0.1:8001')

# Brevo Transactional Email Integration Settings
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', '')
BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME', 'BloodChain AI Emergency Notifications')
BREVO_INTEGRATION_ENABLED = os.environ.get('BREVO_INTEGRATION_ENABLED', 'false').lower() in ('true', '1', 'yes')
BREVO_WEBHOOK_SECRET = os.environ.get('BREVO_WEBHOOK_SECRET', '')

