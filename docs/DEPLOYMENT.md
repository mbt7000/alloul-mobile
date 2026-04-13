# ALLOUL&Q — Deployment Guide

## Production environment

**Server:** Hostinger VPS `76.13.216.178`
**Service:** `systemctl status alloul-api.service`
**Venv:** `/root/allou-backend/venv`
**Ollama:** `127.0.0.1:11434` (llama3.2:3b)

## Backend deployment

### 1. First-time setup
```bash
ssh root@76.13.216.178
cd /root/allou-backend
git pull origin ui/prototype-alignment
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Database migration
```bash
cd backend
./scripts/migrate.sh stamp   # ONCE, on existing DB
./scripts/migrate.sh up      # apply new migrations
```

### 3. Env vars
Edit `/root/allou-backend/backend/.env`:
```
DATABASE_URL=postgresql://user:pass@localhost/alloul
SECRET_KEY=<openssl rand -hex 32>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@alloul.app
DAILY_API_KEY=...
DAILY_SUBDOMAIN=alloul
SENTRY_DSN=https://...@sentry.io/...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=https://alloul.app
```

### 4. Restart
```bash
systemctl restart alloul-api.service
journalctl -u alloul-api.service -f
```

## iOS deployment

### Option A: Xcode direct upload (recommended — bypasses EAS Submit issues)
```bash
cd ios
xcodebuild -scheme AlloulOne -workspace AlloulOne.xcworkspace \
  -configuration Release -destination "generic/platform=iOS" \
  archive -archivePath /tmp/AlloulOne.xcarchive
xcodebuild -exportArchive -archivePath /tmp/AlloulOne.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/AlloulExport -allowProvisioningUpdates
```

### Option B: EAS Build
```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

## Android deployment
```bash
eas build -p android --profile production
```

## Stripe products (one-time setup)
```bash
stripe products create --name "ALLOUL&Q Starter" --description "5 employees, 14-day trial"
stripe prices create --product <id> --unit-amount 3000 --currency usd --recurring interval=month
# repeat for yearly + other tiers
```
Paste price IDs into `.env`.

## Monitoring
- **Sentry:** https://sentry.io/organizations/alloul
- **Server logs:** `journalctl -u alloul-api.service -f`
- **Database backups:** cron job at `/etc/cron.daily/alloul-pgbackup`
