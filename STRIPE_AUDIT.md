# ALLOUL&Q — Stripe Integration Audit

**Date:** 2026-04-14
**Scope:** Backend, Web frontend, Mobile, Stripe Dashboard
**Result:** Two parallel implementations exist. Cleanup plan below.

---

## 1. Stripe code locations

| Layer | File | LOC | Status |
|---|---|---|---|
| **Backend (canonical)** | `backend/routers/companies.py:221-350` | ~130 | ✅ **In production**, deployed, working |
| **Backend (canonical)** | `backend/routers/webhooks.py` | 90 | ✅ **In production**, working |
| **Backend (NEW, not deployed)** | `backend/routers/billing.py` | 455 | ⚠️ Built this session — not deployed, **conflicts with above** |
| **Backend config** | `backend/config.py:54-59` | 6 | ✅ Has live price IDs |
| **Backend models** | `backend/models.py` (Subscription) | — | ✅ Used by both |
| **Mobile (NEW)** | `src/api/billing.api.ts` | 105 | ⚠️ Built this session — points to non-deployed `/billing/*` |
| **Mobile (NEW)** | `src/features/billing/screens/PricingScreen.tsx` | 200 | ⚠️ Calls `/billing/checkout-session` (doesn't exist on server) |
| **Mobile (NEW)** | `src/features/billing/screens/BillingScreen.tsx` | 200 | ⚠️ Same issue |
| **Web (Cowork)** | `web/src/lib/stripe.ts` | 76 | ✅ Stripe.js loader (not duplicate) |
| **Web (Cowork)** | `web/src/app/pricing/page.tsx` | ~500 | ⚠️ Hardcoded prices (30/90/210), don't match server (24/59/289) |
| **Web (Cowork)** | `web/src/app/subscribe/page.tsx` | ~500 | ⚠️ Different plan names (professional/business) |
| **Web (Cowork)** | `web/src/app/settings/billing/page.tsx` | — | ⚠️ Reuses /companies/subscribe? unclear |
| **Web (Cowork)** | `web/src/app/admin/subscriptions/page.tsx` | — | ⚠️ Admin view |
| **Web (Cowork)** | `web/src/app/start-trial/page.tsx` | — | ⚠️ Trial entry |
| **Web (Cowork)** | `web/src/app/enterprise/page.tsx` | — | Enterprise contact form |

**Files the user mentioned that DO NOT exist:**
- ❌ `backend/routers/subscriptions.py` (never created)
- ❌ `backend/routers/enterprise.py` (never created)
- ❌ `backend/services/email_service.py` (we have `email.py` instead)

---

## 2. Stripe Dashboard (live data via MCP)

**3 products exist** — no duplicates, but **mismatched names and prices**:

| Stripe Product | Stripe ID | Stripe Price | Amount (USD) | Code uses it as |
|---|---|---|---|---|
| **Starter** | `prod_UB8zDoyn2YPFFY` | `price_1TCmhyGPIIEnFHbUxri6Zbcw` | **$24/mo** | ✅ Used by `companies.py` |
| **Pro** | `prod_UB90ckEsKlawsj` | `price_1TCmiqGPIIEnFHbUahgCLsew` | **$59/mo** | ✅ Used by `companies.py` |
| **Pro Plus** | `prod_UB91gU3Z32gHKq` | `price_1TCmjpGPIIEnFHbUSeG8GkZK` | **$289/mo** | ✅ Used by `companies.py` |

⚠️ **Only monthly prices exist in Stripe.** No yearly prices created yet.

⚠️ **Price/name mismatch across the codebase:**

| Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| **Stripe Dashboard** | Starter $24 | Pro $59 | Pro Plus $289 | — |
| **`backend/companies.py`** | starter ($24, 5 emp) | pro ($59, 21 emp) | pro_plus ($289, 33 emp) | enterprise (contact) |
| **`backend/billing.py` (NEW)** | starter ($30, 5 emp) | professional ($90, 15 emp) | business ($210, 32 emp) | — |
| **`web/pricing/page.tsx`** | starter ($30, ?) | professional ($90, ?) | business ($210, ?) | enterprise |
| **`src/api/billing.api.ts` (NEW)** | starter ($30, 5 emp) | professional ($90, 15 emp) | business ($210, 32 emp) | — |

**Three different price/name conventions are live in the codebase simultaneously.**

---

## 3. Production endpoint test (api.alloul.app)

```bash
$ curl /health                        → 200 ✅
$ curl /companies/stripe-config       → 401 (auth required) ✅
$ openapi.json | grep stripe          → 5 routes found:
  /companies/stripe-config
  /companies/subscribe
  /companies/cancel-subscription
  /companies/subscription-status
  /webhooks/stripe
```

**`/billing/*` and `/enterprise/*` are NOT in production** — they exist only locally on `ui/prototype-alignment` branch.

---

## 4. Conflicts

### 🔴 Critical conflict: TWO webhook handlers
- `/webhooks/stripe` (old, in `webhooks.py`) — keys subscriptions by `company_id` from metadata
- `/billing/webhook` (new, in `billing.py`) — keys subscriptions by `user_id` from metadata

Both would process the same Stripe events if both deployed. The first one wins because it's at `/webhooks/stripe` (the URL configured in Stripe Dashboard).

### 🔴 Critical conflict: TWO subscription models
- `companies.py` treats `Subscription.company_id` as the join key
- `billing.py` treats `Subscription.user_id` as the join key

The actual `models.py:Subscription` table — let me verify which fields exist (it's keyed by `company_id` based on the existing webhook handler logic).

### 🟡 Tier mismatch
- Stripe has 3 monthly prices (Starter/Pro/Pro Plus) at **$24/$59/$289**
- `companies.py` matches Stripe correctly
- `billing.py` invents new tiers (Starter/Professional/Business at $30/$90/$210) that **don't exist in Stripe**
- Web frontend uses the **invented** prices ($30/$90/$210)
- 14-day trial: Stripe prices have `trial_period_days: null`, but `companies.py` adds it via `subscription_data` ✅

### 🟡 Mobile billing screens don't work
- `PricingScreen.tsx` calls `/billing/checkout-session` → 404 on prod
- `BillingScreen.tsx` calls `/billing/subscription` → 404 on prod
- Mobile billing API never wired to actual Stripe

---

## 5. Final report

### ✅ What works (in production)
1. `companies.py` Stripe integration (subscribe, cancel, status, config)
2. `webhooks.py` handler at `/webhooks/stripe`
3. 3 Stripe products + 3 monthly prices already created
4. Backend `Subscription` model with `company_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan_id`, `status`, `trial_end`, `current_period_end`, `cancel_at_period_end`
5. Web pricing page (visual only)

### ⚠️ What needs unification
1. **Mobile billing API** must call **`/companies/subscribe`** instead of `/billing/checkout-session`
2. **Web pricing page** must show **real prices** ($24/$59/$289) instead of $30/$90/$210
3. **Plan names** must match across all surfaces — pick ONE: `starter/pro/pro_plus` (matches Stripe + production code)
4. **Yearly prices** need to be created in Stripe Dashboard if yearly billing is needed
5. **Enterprise flow** doesn't exist on backend (no router) — needs creating OR removed from web

### ❌ What needs deleting (duplicates from this session)
1. `backend/routers/billing.py` (455 lines — conflicts with `companies.py`)
2. Mobile `src/api/billing.api.ts` invented PLANS metadata (needs rewrite to call `/companies/*`)
3. Mobile `src/features/billing/screens/PricingScreen.tsx` price values
4. Mobile `src/features/billing/screens/BillingScreen.tsx` API calls
5. The `import billing` in `backend/main.py` (line 27) and `app.include_router(billing.router)` (line 191)

### 📋 Unification plan

**Option A — Use existing `companies.py` (recommended)**
1. Delete `backend/routers/billing.py`
2. Remove `billing` from `main.py` imports + `include_router`
3. Rewrite `src/api/billing.api.ts` to call `/companies/subscribe`, `/companies/subscription-status`, `/companies/cancel-subscription`, `/companies/stripe-config`
4. Update mobile `PricingScreen.tsx` to fetch live config from `/companies/stripe-config` (no hardcoded prices)
5. Update mobile plan names to `starter / pro / pro_plus`
6. Update `web/src/app/pricing/page.tsx` to fetch live prices or use the same constants
7. Keep `/webhooks/stripe` as the single webhook URL in Stripe Dashboard

**Option B — Migrate to new `billing.py`**
- Requires creating yearly Stripe prices
- Requires changing `Subscription.company_id` to `user_id` (data migration)
- Requires updating Stripe Dashboard webhook URL to `/billing/webhook`
- Higher risk, more work — not recommended

---

## 6. Recommended actions

**STOP** — no destructive changes until user confirms which option to take.

If user says **Option A** (recommended):
1. `git rm backend/routers/billing.py`
2. Remove import + include_router in `main.py`
3. Rewrite `src/api/billing.api.ts` (~80 lines)
4. Update `PricingScreen.tsx` to use live config endpoint
5. Verify endpoints with curl
6. Single commit: "refactor: unify Stripe integration around companies.py"

If user says **Option B**:
- Delete `companies.py` Stripe code
- Migrate webhook URL in Stripe
- Create yearly prices in Stripe Dashboard
- Run a data migration

---

## 7. Endpoint test results

```
Production:
  GET  /health                              → 200 ✅
  GET  /companies/stripe-config             → 401 (needs auth) ✅
  POST /companies/subscribe                 → exists in OpenAPI ✅
  POST /companies/cancel-subscription       → exists in OpenAPI ✅
  GET  /companies/subscription-status       → exists in OpenAPI ✅
  POST /webhooks/stripe                     → exists in OpenAPI ✅

  GET  /billing/subscription                → 404 ❌ (not deployed)
  POST /billing/checkout-session            → 404 ❌ (not deployed)
  POST /billing/webhook                     → 404 ❌ (not deployed)
  POST /enterprise/contact                  → 404 ❌ (no router exists)
```

**Local branch** (`ui/prototype-alignment`):
- All `/billing/*` routes exist in code but never tested against a running server.

---

## Summary

| | Count |
|---|---|
| Stripe products in Dashboard | **3** (Starter / Pro / Pro Plus) |
| Stripe prices in Dashboard | **3 monthly only** |
| Backend Stripe routers | **2 (conflict)** — `companies.py` (prod) + `billing.py` (new, unused) |
| Webhook handlers | **2 (conflict)** — `/webhooks/stripe` (prod) + `/billing/webhook` (new) |
| Mobile pricing surfaces | **3 (mismatched)** — PricingScreen + BillingScreen + companies API |
| Web pricing surfaces | **5 pages** — pricing, subscribe, billing, admin, start-trial |
| Tier name conventions | **2** — `starter/pro/pro_plus` vs `starter/professional/business` |
| Price conventions | **2** — $24/$59/$289 vs $30/$90/$210 |

**Bottom line:** The new `billing.py` I built earlier in this session **duplicates** the existing production `companies.py` Stripe code with **incompatible tier names and prices**. The right move is to **delete `billing.py` and rewire the mobile to use `/companies/*`**.

**No destructive changes have been made.** Awaiting user decision on Option A vs B.
