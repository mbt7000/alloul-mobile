# ALLOUL&Q

> منصة الأعمال الذكية · The Smart Business Platform

[![CI](https://github.com/mbt7000/alloul-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/mbt7000/alloul-mobile/actions)

A mobile-first, AI-powered workspace for modern teams. Corporate collaboration + social media + real-time communication in one platform.

---

## ✨ Features

### Corporate Workspace
- 📊 Dashboard with real-time stats
- ✅ Tasks, Projects, Meetings, Handovers, Deals, CRM
- 👥 Team management + org chart hierarchy
- 🗓️ Meetings via Daily.co, Google Meet, Zoom, Teams
- 🤖 AI Assistant (Ollama + Claude)
- 📚 Knowledge base + Hiring board

### Social Media
- 📰 Posts feed (likes, reposts, saves, comments)
- 📸 Stories (24h expiry, Instagram-style)
- 🔴 Live streaming for verified news channels
- 👤 Profiles, followers/following, DMs
- 🏘️ Communities, Marketplace, Job board

### Platform
- 🔐 Multi-provider auth (Google, Apple, GitHub, Email, Azure AD)
- 💳 Stripe subscriptions (3 tiers + Enterprise)
- 📧 SendGrid email system (29 branded templates)
- 🛡️ Sentry crash reporting
- 🌍 5 languages (ar, en, fr, es, hi)
- 🎨 Glassmorphism dark UI
- 🔔 Push notifications (Expo)

---

## 🏗️ Architecture

```
React Native (Expo SDK 54)   ───▶   FastAPI (Python 3.11+)
                                     ├── PostgreSQL / SQLite
                                     ├── Ollama (local AI)
                                     ├── Stripe
                                     ├── SendGrid
                                     ├── Daily.co
                                     └── Sentry
```

---

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
./scripts/migrate.sh stamp  # if upgrading existing DB
./scripts/migrate.sh up     # fresh install
uvicorn main:app --reload
```

### Mobile
```bash
npm install --legacy-peer-deps
npx expo start
```

### iOS build
```bash
cd ios && pod install
xcodebuild -scheme AlloulOne -workspace AlloulOne.xcworkspace \
  -configuration Release -destination "generic/platform=iOS" \
  archive -archivePath /tmp/AlloulOne.xcarchive
```

---

## 📂 Project Structure

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for a full audit report.

```
alloul-mobile/
├── src/                    # React Native frontend
│   ├── api/               # API clients (15+ files)
│   ├── features/          # Feature modules
│   ├── navigation/        # Stack/tab navigators
│   ├── components/ui/     # Design system
│   ├── brand/             # ALLOUL&Q brand constants
│   ├── theme/             # Design tokens
│   └── config/            # Sentry, env
├── backend/               # FastAPI backend (canonical)
│   ├── routers/          # 34 API routers
│   ├── services/         # email, sentry, ai_engine
│   ├── middleware/       # audit logging
│   ├── migrations/       # Alembic
│   └── tests/            # pytest
├── assets/logo/          # Brand assets
├── ios/                  # Native iOS project
└── android/              # Native Android project
```

---

## 💳 Subscription Plans

| Plan | Price | Employees | Features |
|---|---|---|---|
| **Starter** | $30/mo, $300/yr | 5 | 14-day trial, core features |
| **Professional** | $90/mo, $900/yr | 15 | Advanced reports, priority support |
| **Business** | $210/mo, $2100/yr | 32 | API access, custom integrations |
| **Enterprise** | Contact sales | Unlimited | SLA, dedicated support, custom |

---

## 🛠️ Development

```bash
# Frontend TypeScript check
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit

# Backend tests
cd backend && pytest tests/ -v

# Create a database migration
cd backend && ./scripts/migrate.sh new "describe your change"
```

---

## 🔐 Environment Variables

See [backend/.env.example](backend/.env.example) for the full list.

**Required for production:**
- `DATABASE_URL`, `SECRET_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- `DAILY_API_KEY`, `DAILY_SUBDOMAIN`
- `SENTRY_DSN`
- Firebase, OAuth client IDs

---

## 📄 License

© 2026 Alloul Digital. All rights reserved.
