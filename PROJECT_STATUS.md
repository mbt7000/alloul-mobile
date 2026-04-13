# ALLOUL&Q — Project Status Report

**Date:** 2026-04-14
**Repository:** `mbt7000/alloul-mobile`
**Current branch:** `ui/prototype-alignment`
**Working directory:** `/Users/t/Desktop/alloul-mobile`

---

## 1. Project Structure

```
alloul-mobile/
├── src/                          ← React Native / Expo frontend
│   ├── api/             (15 files — client + per-feature APIs)
│   ├── features/        (12 feature modules: auth, meetings, media, companies, chat, …)
│   ├── navigation/      (MediaNavigator, CompanyNavigator, AppControllerNavigator)
│   ├── shared/          (ProfileScreen, layout, ui primitives, components)
│   ├── components/      (calls: IncomingCallScreen, DailyCallScreen)
│   ├── state/           (auth, company, mode, notifications contexts)
│   ├── context/         (CallContext)
│   ├── hooks/           (useCallSignaling, useExpoPushToken)
│   ├── storage/         (token, session, recentSearches)
│   ├── i18n/            (ar, en, fr, es, hi)
│   ├── theme/           (ThemeContext, palettes)
│   └── config/          (env, routes)
│
├── backend/                      ← FastAPI backend (canonical)
│   ├── routers/         (33 routers — see §5)
│   ├── services/
│   │   └── ai_engine/   (Ollama-backed extraction)
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── schemas.py
│
├── routers/                      ← Duplicate copy at root (legacy)
├── models.py                     ← Duplicate copy at root (legacy)
├── ios/                          ← Native iOS project (Xcode)
├── android/                      ← Native Android project
├── assets/                       ← Icons, splash, ringtone.wav, fonts
├── app.json                      ← Expo config
├── eas.json                      ← EAS build/submit profiles
└── package.json                  ← Frontend dependencies
```

**⚠️ Note:** Python backend exists in **two locations** — canonical `backend/` and a duplicate at root (`models.py`, `routers/`, etc.). The duplicate is legacy from a previous restructure and creates drift risk. The canonical backend is `backend/`.

---

## 2. Tech Stack

### Frontend (Mobile)
- **React Native 0.81.5** + **Expo SDK 54**
- **React 19.1.0** (latest, bleeding edge)
- **TypeScript 5.9**
- **React Navigation v7** (native-stack, bottom-tabs, drawer)
- **i18next** (5 languages: ar, en, fr, es, hi)
- **New Architecture (Fabric)** — enabled, Hermes engine

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy ORM**
- **SQLite** (dev — `app.db`) / **PostgreSQL** (production)
- **Local Ollama** (`llama3.2:3b`) for AI extraction
- **Anthropic SDK** for `/agent/chat` (optional)

### Key libraries
- `expo-apple-authentication`, `expo-auth-session` — OAuth
- `expo-notifications` — push notifications
- `expo-image-picker` — camera/gallery
- `expo-av`, `expo-blur`, `expo-haptics`
- `expo-web-browser` — for Daily.co rooms
- `firebase` (REST only, no SDK init)
- `react-native-webview`, `react-native-reanimated 4.x`, `react-native-gesture-handler`

### Code size
| Surface | Files | LOC |
|---|---|---|
| Frontend (`src/**/*.{ts,tsx}`) | 161 | **29,120** |
| Screen components (`*Screen.tsx`) | 69 | — |
| Frontend API clients | 15 | — |
| Backend routers | 32 | — |
| Backend models (`models.py`) | 42 tables | 821 |
| `backend/main.py` | — | 188 |
| `App.tsx` | — | 167 |
| **Dependencies** | 39 prod + 5 dev | — |

---

## 3. Features Implemented

### ✅ Working
- **Authentication** — email/password, Google OAuth (iOS native), Apple Sign In, GitHub OAuth, Firebase REST token exchange, Azure AD. Secure token storage via `expo-secure-store`.
- **User profile** — cover photo, avatar, bio, username, edit via new `EditProfileScreen`
- **Followers / Following lists** — full API + tabs + follow/unfollow mutations
- **Posts feed** — create, like, repost, save, comments, `/posts/` endpoint
- **Media tabs** — Feed, Explore, Jobs, Marketplace, Communities, Saved
- **Stories** — create (camera/gallery), Instagram-style viewer with auto-advance & progress bars, 24h expiry, view tracking
- **Live streaming stub** — verified news channels (`is_news_channel=1`) can create live stories with LIVE badge
- **Direct messages** — conversations + message screen
- **Notifications** — list + tap to navigate (PostDetail / UserProfile / Conversation / CallHistory)
- **Company workspace** — new clean CompanyDashboardScreen (quick actions + services grid + stats + activity + Daily room card)
- **Categorized services page** (`CompanyServicesScreen`)
- **Team hierarchy** (`CompanyTeamHierarchyScreen`) — vertical org chart grouped by role
- **Team members + presence** (`MeetingsInfoScreen`) — online/offline, list/tree toggle, call + message + video buttons (company context only)
- **Edit Services** — pick quick-access services, stored in AsyncStorage
- **News feed** (`CompanyNewsScreen`)
- **Profile menu** (`CompanyProfileMenuScreen`) — vertical nav cards
- **Meetings** — CRUD, Daily.co join, provider selector (Meet/Zoom/Teams/Daily/office)
- **Tasks, projects, handovers, deals** — CRUD APIs + screens
- **Company Daily.co room** — `/daily/company-join` endpoint, prominent "غرفة الشركة المباشرة" card with LIVE badge on dashboard
- **AI Compose Sheet** — parse-task, parse-handover, parse-transaction, summarize-note (preview → confirm pattern)
- **AI Assistant chat** — `/agent/chat` streaming with mode switching
- **Calls (company only)** — WebSocket signaling, ringtone (wav), Daily browser integration, call history
- **Settings (X-style)** — new `XSettingsScreen` with grouped sections, functional items
- **Knowledge base, CRM, Reports, Hiring Board, Roles, Approvals Inbox** — screens + APIs
- **Dark/light theme toggle**
- **5-language i18n**

### ⚠️ Partial / Buggy
- **Daily.co access** — backend endpoint exists and is wired, but **requires `DAILY_API_KEY` and `DAILY_SUBDOMAIN` env vars on the server**. Without them, the API returns 503. The frontend UI is now discoverable (prominent card added).
- **Push notifications** — Expo push tokens register, but the backend send path is minimal; no dedicated "push templates" screen.
- **Company Files** — screen exists but uses placeholder data; no real file upload backend.
- **Password change** — UI placeholder only (`Alert` says "coming soon"), no backend endpoint wired.
- **Subscription/billing** — Stripe hooks exist in `backend/routers/webhooks.py`, but the full plan-management UI just shows `SubscriptionPlansScreen` without Stripe checkout integration.
- **Image upload for stories** — `/upload/image` endpoint used; if upload fails, the story creation now correctly errors instead of saving a local URI (was a bug, fixed).
- **Live streaming** — metadata + badge + join URL work, but the actual streaming infrastructure is external (user-provided `live_url`). No embedded player.
- **Code duplication** — root-level Python files (`routers/`, `models.py`, etc.) mirror `backend/` and drift apart.

### ❌ Missing / Not Implemented
- **Stripe checkout integration** (SubscriptionPlans screen shows tiers but doesn't redirect to payment)
- **SendGrid email sending** — not integrated
- **Supabase** — not used; all storage is direct SQLAlchemy + local FS
- **OTA update publishing** — wired in config but no updates published to EAS (confirmed via `eas update:list`)
- **Real-time video streaming** (Daily is via WebBrowser, not native SDK)
- **Android build** — project structure exists but no EAS Android build has been submitted recently
- **Comprehensive test suite** — no jest/detox tests visible
- **Analytics** (Mixpanel/Amplitude/Sentry) — not integrated
- **Dedicated in-app file/document upload** for knowledge base

---

## 4. Database

**42 SQLAlchemy models** in `models.py` / `backend/models.py`:

| Group | Tables |
|---|---|
| **Users & Social** | User, Follow, UserBlock, Notification, Story, StoryView |
| **Posts** | Post, PostLike, PostComment, PostRepost, PostSave |
| **Companies** | Company, Subscription, Invoice, EnterpriseLead, SubscriptionNotification, Department, CompanyMember, CompanyInvitation, CompanyOnboarding, ActivityLog |
| **Projects/Tasks** | Project, ProjectTask, Meeting, MeetingAttendee |
| **Handover/Sales/Deals** | HandoverRecord, SalesLedger, MemoryRecord, DealRecord |
| **Communities** | Community, CommunityMember, CommunityPost |
| **Messaging** | Channel, ChannelMessage, DirectConversation, DirectMessage |
| **Jobs & CV** | UserCV, JobPosting, JobApplication |
| **Calls** | CallLog |
| **AI** | AgentMessage |
| **Ads** | Ad |

**Migrations:** None. Schema is managed via `Base.metadata.create_all()` on startup — fine for SQLite dev, but production Postgres needs proper Alembic migrations before scaling.

**State:** All relationships wired with `cascade="all, delete-orphan"` where appropriate. No foreign-key orphans observed.

---

## 5. APIs

**32 routers registered in `backend/main.py`:**

### Auth & Identity
- `auth` — login, register, /me, Firebase, Azure AD
- `phone` — SMS OTP (Twilio, not verified configured)
- `follows` — follow/unfollow, followers, following, user profile
- `webhooks` — Stripe webhooks (partial)

### Social Media
- `posts` — CRUD, likes, reposts, saves
- `communities` — community groups
- `stories` — create, list (24h expiry), view tracking, live streaming metadata
- `notifications` — list, mark read, unread count
- `messages` — DM conversations
- `marketplace` — marketplace listings
- `search` — internal search
- `ads` — ad slots

### Company
- `companies` — my company, subscription status, roles, members, departments, invitations, stats
- `dashboard` — stats, activity
- `projects` — project CRUD + tasks
- `handover` — handover records + AI analysis
- `deals` — CRM deals
- `meetings` — meetings CRUD + attendees
- `channels` — company chat channels
- `cv` — user CV
- `job_postings` — hiring board
- `memory` — knowledge entries
- `admin` — admin hub
- `subscriptions` — plan limits (not fully wired)

### Real-time / Communication
- `calls` — initiate, accept, reject, end, history, presence, push token
- `daily_workspace` — `/daily/company-join` (requires env vars)
- `sendbird`, `stream_chat` — alternative chat providers (imported but not primary)

### AI
- `ai_extract` — parse task, handover, transaction, note (Ollama)
- `ai_confirm` — save confirmed extractions to DB
- `agent` — streaming chat + analyze

### Utility
- `upload` — image upload
- `enterprise` — enterprise leads

---

## 6. Frontend Pages / Routes

### Media Navigator (public/social)
- `MediaTabs` (Feed, Explore, Jobs, Marketplace, Communities, Saved, Profile)
- `CreatePost`, `PostDetail`
- `CreateStory` (auto-opens camera, Snapchat-style)
- `StoryViewer` (progress bars, auto-advance)
- `FollowList` (followers/following with tabs)
- `DirectMessages`, `Conversation`
- `Settings` → new `XSettingsScreen`
- `EditProfile` (new)
- `UserProfile`, `CompanyProfile`
- `Discover`, `Notifications`, `CallHistory`
- `CVScreen`, `JobApplications`

### Company Navigator (workspace)
- `CompanyWorkspace` → new `CompanyDashboardScreen` (clean dark UI)
- `Apps` → new `CompanyServicesScreen` (categorized)
- `EditServices`, `TeamHierarchy`, `CompanyNews` (new)
- `Profile` → new `CompanyProfileMenuScreen` (vertical nav)
- Legacy screens kept: `CompanyWorkspaceLegacy`, `AppsLegacy`, `ProfileLegacy`, `SettingsLegacy`
- Meetings, Tasks, Projects, Handover, Chat, Knowledge, CRM, Reports, HiringBoard, Roles, Inbox, AiAssistant, InternalSearch, SubscriptionPlans, CallHistory, CompanyOnboarding

### Auth Navigator
- `LoginScreen`, `PhoneVerifyScreen`, `OnboardingScreen`

**Design system:** Dark mode primary (bg `#0b0b0b`, card `#151515`). Recent screens follow X (Twitter) aesthetic with clean borders, grouped lists, and rounded 16–22px cards. Legacy screens use glass-morphism with accent cyan gradients.

---

## 7. Integrations Status

| Integration | Status | Notes |
|---|---|---|
| **Firebase Auth (REST)** | ✅ Wired | Google/GitHub/Apple → Firebase ID token → backend |
| **Google OAuth** | ✅ Working | iOS native client ID in app.json |
| **Apple Sign In** | ✅ Working | Entitlement + `expo-apple-authentication` |
| **GitHub OAuth** | ✅ Working | Client ID `Ov23lilP6oyNimxHqyXB` |
| **Microsoft / Azure AD** | ⚠️ Backend endpoint exists | UI exists, not frequently tested |
| **Daily.co** | ⚠️ Code wired | Requires `DAILY_API_KEY` + `DAILY_SUBDOMAIN` server env vars |
| **Ollama (AI)** | ⚠️ Runtime dep | Needs `llama3.2:3b` running at `127.0.0.1:11434` on server |
| **Anthropic API** | ⚠️ Optional | `ANTHROPIC_API_KEY` optional for `/agent/chat` |
| **Stripe** | ❌ Partial | Webhook route exists, no checkout flow |
| **SendGrid** | ❌ Not integrated | — |
| **Supabase** | ❌ Not used | — |
| **Twilio SMS** | ⚠️ Code exists | `routers/phone.py`, OTP not fully verified |
| **Expo Push** | ✅ Registered | Expo project `0b7b9938…`, tokens stored |
| **EAS Build** | ✅ Production credentials | `credentialsSource: remote`, API key `XLMD63KGBK` |
| **TestFlight** | ⚠️ Via Xcode direct upload | EAS Submit has been failing — bypassed using `xcodebuild -exportArchive` |
| **EAS Update (OTA)** | ❌ Zero updates published | `eas update:list` shows empty for production channel |

---

## 8. Known Issues

### Critical
1. **Duplicate Python backend** at repo root vs `backend/` — active drift risk. **`backend/` is canonical**; root-level copy should be deleted.
2. **EAS Submit broken** — returns generic "Something went wrong" from Apple. Workaround in use: local `xcodebuild archive` + `exportArchive` with `credentialsSource: remote`. Root cause likely the stored ASC API key permissions.
3. **No DB migrations** — schema changes currently require manual `DROP`/`CREATE` on production. Needs Alembic before Postgres scale.

### High
4. **WebSocket token in URL query param** (`src/hooks/useCallSignaling.ts:55`) — token logged in URL strings, security concern. Should move to header-based auth.
5. **`react-native-gesture-handler` 2.28** peer-depends on Reanimated 3, project uses Reanimated 4. No crash observed but incompatible by spec.
6. **No Alembic migrations** — startup-time `create_all()` only.
7. **Legacy code dead weight** — many `*Legacy` routes kept (old workspace, old settings, old profile) bloat the bundle.

### Medium
8. **Firebase dep installed but unused as SDK** — 500KB+ dead code in bundle.
9. **`react-native-webview` in deps, not used** — another ~200KB bloat.
10. **No error tracking** (Sentry/Crashlytics) — blind spot on production crashes.
11. **Firebase `GoogleService-Info.plist` path not in `ios.googleServicesFile`** in the current app.json (was added in my fix). Verify before Android release.
12. **No test suite** — 29k LOC, zero unit/integration tests.

### Low
13. **Build number drift** between `app.json`, Info.plist, and EAS auto-increment — currently managed manually.
14. **`.easignore` excludes some iOS-specific paths** — entitlements force-added to git to work around this.
15. **Some Arabic copy is hardcoded**, doesn't use i18n keys.
16. **`Alert.prompt` historical crash on Android** — already fixed via Modal.

---

## 9. Git Status

### Current branch
`ui/prototype-alignment` — active development branch. Up to date with `origin`.

### Other branches
- `main` — stale (last commit older than `ui/prototype-alignment`)
- `2026-03-25-jp10` — old snapshot
- `remotes/origin/main`, `remotes/origin/ui/prototype-alignment`

### Recent commits (last 10)
```
594a35d feat: calls company-only + functional settings + tappable notifications + camera story
d960032 feat: X-style settings screen (both media and company navigators)
a24f9de fix: Daily Room prominent card + X-style media header
2682bd1 feat: complete Company UI restructure — profile/team/news/edit services
5233b96 feat: restructure Company UI — clean dark dashboard + categorized services
a5f57f8 fix: stories black image + premium mode switcher + X-style improvements
aa0b88e fix: add StoriesBar to MediaHomeScreen (the actual visible home tab)
4050cef fix: remove نمط التواصل, add followers/following lists, improve AI errors
bc12661 feat: org chart tree view + message button in team section
7f75420 feat: stories + live streaming for verified news channels
```

### Unstaged / Untracked
The **root-level Python files** (`main.py`, `models.py`, `routers/__init__.py`, `auth.py`, `config.py`, `database.py`, `firebase.json`, `plan_limits.py`, `requirements.txt`, etc.) show as untracked. These are the **duplicate backend** — should be deleted, not committed.

Actual tracked modifications in working tree: `main.py`, `models.py` (root duplicates — drifted from `backend/`).

---

## 10. Environment

### `.env.example` present at root AND in `backend/`
Required vars (from `.env.example`):
- `DATABASE_URL` (sqlite dev, postgres prod)
- `SECRET_KEY` (JWT)
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- Firebase: `FIREBASE_PROJECT_ID`, service account
- `ANTHROPIC_API_KEY` (optional)
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`
- `DAILY_API_KEY`, `DAILY_SUBDOMAIN` (both **commented out** in example, must be set)
- OAuth: `GOOGLE_*`, `GITHUB_*`, `APPLE_*`
- Stripe: keys (optional)
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Seed admin bootstrap (dev only)

### `.env.local` exists (unreviewed, likely has real secrets — not committed)

### Dependencies
- Frontend `node_modules/` present (installed)
- Backend: `backend/.venv` present
- iOS Pods present (101 pods)

### Production server
- Hostinger VPS `srv1431166.hstgr.cloud` (76.13.216.178)
- systemd service `alloul-api.service`
- venv `/root/allou-backend/venv/`
- Ollama running on `127.0.0.1:11434`

---

## 11. Overall Assessment

### What works well
- Full OAuth stack (Google/Apple/GitHub/Firebase)
- Rich social feature set (posts, stories, follows, DMs, notifications)
- Complete company workspace (dashboard, team, meetings, tasks, handovers, deals, CRM, reports)
- AI extraction pipeline wired end-to-end (preview → confirm)
- Clean dark UI refresh shipped across all Company screens
- Daily.co room card now prominent and discoverable
- Settings is functional (was placeholder-only a day ago)
- Profile editing works via `updateMe`
- Story camera opens automatically (Snapchat-style)
- Notifications are fully tappable and route contextually
- Call isolation enforced: media has no call buttons, company-only

### What needs fixing (priority order)
1. **Delete root-level duplicate backend files** (`main.py`, `models.py`, `routers/`, `auth.py`, etc.) — keep only `backend/`
2. **Fix EAS Submit** — regenerate ASC API key, re-register with EAS
3. **Configure `DAILY_API_KEY` + `DAILY_SUBDOMAIN`** on the production server
4. **Add Alembic migrations** before any production schema change
5. **Move WebSocket auth from URL query to header**
6. **Remove unused deps**: `firebase` (SDK), `react-native-webview`
7. **Strip `*Legacy` navigator routes** once new UI validated
8. **Add Sentry or similar crash reporting**
9. **Wire real Stripe checkout** for subscriptions

### Missing entirely
- Stripe payment flow (UI + webhooks complete but no checkout)
- Email sending (SendGrid)
- Real-time video SDK (Daily via browser only)
- Test suite (jest / detox)
- Alembic migrations
- Android production build pipeline

### Completion estimate

| Layer | % complete |
|---|---|
| Backend APIs | ~90% |
| Frontend screens | ~92% (UI restructure just shipped) |
| Auth & identity | ~95% |
| Social features | ~85% |
| Company workspace | ~88% |
| Payments/billing | ~25% |
| AI pipeline | ~80% |
| Real-time calls | ~70% |
| Testing/QA | ~5% |
| DevOps/CI | ~40% |
| **Overall** | **~75–80%** |

### Production-ready?
**No — not yet.** Blockers:
- No DB migrations (will lose data on any model change in prod)
- No crash reporting
- Duplicate backend drift (critical source of truth confusion)
- Payment flow incomplete
- Tests missing
- EAS Submit broken (current workaround is fragile)

### Time to production estimate
- **Minimum viable (private TestFlight + light traffic):** ~1 week of focused work on the 8 "what needs fixing" items
- **Full public production:** ~3–4 weeks to add tests, Stripe, migrations, monitoring, Android pipeline

### Critical issues count
**3 critical**, **4 high**, **5 medium**, **4 low** = **16 known issues**

---

## 12. Recommendations

### Immediate (this week)
1. **Single source of truth for backend**: delete root-level `*.py` files, add a pre-commit hook preventing commits outside `backend/`.
2. **Initialize Alembic**: `alembic init migrations` inside `backend/`, generate baseline from current models, never call `create_all` again in production.
3. **Set Daily.co env vars** on production server; verify `/daily/company-join` returns 200.
4. **Regenerate ASC API key**, replace in EAS credentials, validate `eas submit` works.
5. **Purge unused deps**: remove `firebase`, `react-native-webview` from package.json, run `npx expo install --fix`.

### Short-term (next 2 weeks)
6. Add **Sentry** for crash reporting (frontend) and **Sentry/Logfire** (backend).
7. Move WebSocket auth to headers (`Sec-WebSocket-Protocol` token exchange).
8. Wire **Stripe Checkout** for subscription upgrades; complete webhook → `Subscription` table flow.
9. Add basic **jest** unit tests for API clients (`src/api/**`) and core reducers.
10. Drop all `*Legacy` routes + their implementation files after 1 week of validation.

### Medium-term (month 1)
11. Integrate **SendGrid** for transactional email (password reset, invitations, receipts).
12. Publish first **EAS Update (OTA)** to validate the update path.
13. **Android production build** via EAS.
14. Add **detox** E2E tests for critical flows (login, create post, create story, join Daily room).
15. Set up a staging environment separate from production.

### Long-term
16. Migrate SQLite → Postgres in production; verify all queries.
17. Add **CI/CD** pipeline (GitHub Actions: typecheck, test, EAS build on merge).
18. Add **analytics** (PostHog or Mixpanel).
19. Implement real-time video via native Daily.co SDK instead of `WebBrowser`.
20. Internationalize remaining hardcoded Arabic strings.

---

**End of report.**
