# Alloul One Backend (FastAPI)

Auth API for the mobile/web app: email/password and optional Firebase (Google) / Azure AD (Microsoft).

- **GET /** — quick JSON (links to `/health`, `/docs`, auth routes)
- **GET /health** — `{ "status": "ok" }` (used by the mobile “Test server” button)

## Client language (optional)

Mobile and web clients can send **`Accept-Language`** (e.g. `ar`, `en`, `fr`, `es`, `hi`) on API requests. Use it later for localized error messages or content when you add server-side catalogs.

## Endpoints

- **POST /auth/login** — Body: `{ "email", "password" }` → `{ "access_token", "token_type" }`
- **POST /auth/register** — Body: `{ "username", "email", "password" }` → `{ "access_token", "token_type" }`
- **GET /auth/me** — Header: `Authorization: Bearer <token>` → `{ "id", "email", "username", "name", "avatar_url", "created_at" }`
- **POST /auth/firebase** — Body: `{ "id_token": "<Firebase ID token>" }` → `{ "access_token", "token_type", "user" }` (creates/updates user, returns JWT)
- **POST /auth/azure-ad** — Body: `{ "id_token": "<Azure AD id_token>" }` → same (SSO with Microsoft corporate accounts; set MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID)
- **PATCH /auth/me** — Body: `{ "name", "avatar_url" }` → update profile
- **POST /upload/image** — multipart file → `{ "url" }` (Azure Blob); **POST /upload/file** — same for generic files

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set SECRET_KEY, CORS_ORIGINS, and optionally DATABASE_URL, GOOGLE_APPLICATION_CREDENTIALS
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker (from repo root)

```bash
cp backend/.env.example backend/.env   # edit SECRET_KEY at minimum
docker compose up --build
```

API: `http://localhost:8000` — OpenAPI: `http://localhost:8000/docs`

### Mobile app (Expo / TestFlight)

The app reads **`EXPO_PUBLIC_API_URL`** at **build time**. It must be a **public HTTPS URL** (not `localhost`) for real devices. See **`docs/connect-backend-mobile-ar.md`**.

Tables are created on startup. For Firebase OAuth, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your Firebase service account JSON.

## Deploy

- Set `DATABASE_URL` to your PostgreSQL connection string.
- Set `SECRET_KEY` to a strong random value.
- Set `ENVIRONMENT=production`.
- Set `CORS_ORIGINS` to explicit allowed origins (do not use `*` in production).
- Keep `SEED_ADMIN_ENABLED=false` in production. If you need initial admin bootstrap, set `SEED_ADMIN_ENABLED=true` once with `SEED_ADMIN_EMAIL` and a strong `SEED_ADMIN_PASSWORD`, then disable it again.
- For **two-device QA** (e.g. two admins on two phones), enable `SEED_SECOND_USER_ENABLED` with `SEED_SECOND_USER_*`, and set `ADMIN_ALLOWED_EMAILS` / `ADMIN_USERNAMES` so both accounts match `admin_access` (see `backend/.env.example` commented block).
- For OAuth: set `GOOGLE_APPLICATION_CREDENTIALS` or upload the service account file and set the path.
- **Microsoft SSO:** Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_TENANT_ID` for POST /auth/azure-ad (companies can use corporate Microsoft accounts).
- **Azure Blob Storage:** Set `AZURE_STORAGE_CONNECTION_STRING` and optionally `AZURE_STORAGE_CONTAINER` (default: uploads) for profile/company logo and file uploads.
- **Stripe:** Create Products and recurring Prices in [Stripe Dashboard](https://dashboard.stripe.com/products) for Starter ($24/mo), Pro ($59/mo), Pro+ (your price). Copy each Price ID and set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_PLUS` in `.env`. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (from Stripe Developers → Webhooks). **Never commit secret keys to the repo.** Use env vars only.
- Run: `uvicorn main:app --host 0.0.0.0 --port 8000` (or use Gunicorn: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker`).
- Point the mobile app build env **`EXPO_PUBLIC_API_URL`** (and web `NEXT_PUBLIC_API_URL` if any) to this backend URL.
