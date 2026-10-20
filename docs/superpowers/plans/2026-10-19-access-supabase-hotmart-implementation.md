# Supabase Access, Persistence and Hotmart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing recipe, weekly planner and shopping-list preview into a private multi-user application whose access is granted by Hotmart purchase email, verified with a Supabase email OTP, and persisted in Supabase.

**Architecture:** Keep `PlannerService` and the current planner domain unchanged. Add a Supabase-backed repository and a small access boundary around Hono so every private request resolves a verified Supabase user plus an active entitlement; keep Hotmart event processing server-only and idempotent. The browser owns only the Supabase session, while Cloudflare owns authorization, purchase reconciliation and all service-role operations.

**Tech Stack:** React, React Router, TypeScript, Hono, Zod, `@supabase/supabase-js`, Supabase Auth/PostgreSQL/RLS, Cloudflare Workers, Hotmart Webhook 2.0, Vitest, Testing Library and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-full-app-visual-backend-design.md`

## Global Constraints

- Access asks for the Hotmart purchase email and a six-digit OTP only; never ask for a transaction code.
- Return the same safe message from the access-request endpoint whether or not the email is eligible.
- Validate every private request from its bearer token and an active entitlement; never trust a browser-supplied user id or purchase state.
- Validate `X-HOTMART-HOTTOK`, the configured product code and the payload before changing an entitlement.
- Treat Hotmart event `id` as idempotency key; approved/complete activates, refunded/chargeback revokes, and an older event may not overwrite newer purchase state.
- Keep Supabase service-role and Hotmart secrets in Worker secrets only; public Supabase URL and publishable key are the only browser configuration.
- Preserve `PlannerRepository`, `PlannerService`, deterministic generation and shopping-list behavior.
- Store recipe references by stable id and planner data in normalized user-owned rows; do not copy full recipe content into PostgreSQL.
- Keep draft recipes out of production exactly as the current build guard does.
- Stay within Cloudflare, Supabase and Hotmart free tiers for the initial release; do not add paid infrastructure.
- The absence of external credentials must leave deterministic fake-adapter tests green without claiming that a real integration was exercised.

## Review Focus

- An attacker who knows a buyer email but cannot read its inbox never receives a session.
- A valid Supabase user with no active entitlement receives `403` and cannot read or mutate planner data.
- Two users requesting the same week never read, replace or check each other's rows.
- Duplicate or out-of-order Hotmart events produce one final entitlement state based on event creation time.
- Refreshing or reopening the app restores the Supabase session and keeps the selected week's plan and shopping checks.

---

### Task 1: Supabase schema, transactional planner snapshots and RLS

**Files:**
- Create: `supabase/migrations/202610190001_access_planner_schema.sql`
- Create: `supabase/tests/access_planner_rls.sql`
- Create: `src/infrastructure/supabase/database.types.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: tables `profiles`, `entitlements`, `webhook_events`, `access_attempts`, `user_preferences`, `weekly_plans`, `weekly_plan_items`, and `shopping_list_items`.
- Produces: RPCs `save_planner_week_snapshot`, `get_planner_week_snapshot`, `list_planner_week_snapshots`, `claim_active_entitlement`, `process_hotmart_event`, and `consume_access_attempt`.
- Produces: generated-style `Database` TypeScript type consumed only by Supabase adapters.

- [x] **Step 1: Write failing database tests**

Add pgTAP assertions that anonymous access is denied; an authenticated user can select only their own profile, preferences, weeks and shopping rows; cross-user inserts/updates fail; duplicate Hotmart event ids do not duplicate entitlements; and an older event cannot replace a newer entitlement state.

- [x] **Step 2: Run the database tests and verify failure**

Run: `npx --yes supabase test db`

Expected: FAIL because the migration and policies do not exist. If Docker/local Supabase is unavailable, record that limitation and run this gate against the linked development project before production activation.

- [x] **Step 3: Implement the migration**

Use UUID user keys referencing `auth.users`, normalized lower-case email checks, unique provider transaction ids, event timestamps, foreign keys with deliberate delete behavior, indexes for user/week and email/status lookups, and RLS on every user-owned table. Make the snapshot RPC replace a week's generated items transactionally while preserving the supplied manual shopping items and stable checked keys.

- [x] **Step 4: Generate or align the TypeScript database contract**

Expose only the rows and RPC argument/result shapes needed by the application. Keep database names snake_case in the adapter and domain names camelCase outside it.

- [ ] **Step 5: Re-run database tests**

Run: `npx --yes supabase test db`

Expected: PASS with cross-user access denied and idempotency assertions green.

- [x] **Step 6: Commit the database boundary**

```bash
git add supabase package.json pnpm-lock.yaml .gitignore src/infrastructure/supabase/database.types.ts
git commit -m "feat: add Supabase access and planner schema"
```

---

### Task 2: Supabase clients, environment contract and bearer authentication

**Files:**
- Create: `src/infrastructure/supabase/createSupabaseClients.ts`
- Create: `src/application/access/AccessGateway.ts`
- Create: `src/worker/authMiddleware.ts`
- Create: `tests/worker/auth-middleware.test.ts`
- Modify: `src/worker/app.ts`
- Modify: `worker-configuration.d.ts`
- Modify: `wrangler.jsonc`
- Modify: `package.json`

**Interfaces:**
- Produces: `createUserSupabaseClient(url, publishableKey, accessToken)` and `createAdminSupabaseClient(url, serviceRoleKey)` with session persistence disabled in the Worker.
- Produces: `resolveAuthorizedUser(request): Promise<{ userId: string; email: string }>`.
- Produces: Hono variables `authorizedUser` and `userSupabase` for private routes.

- [x] **Step 1: Write failing authentication middleware tests**

Cover missing bearer token (`401`), invalid token (`401`), valid user without active entitlement (`403`), valid entitled user injection, expired/revoked entitlement, and a generic safe error when Supabase is unavailable. Assert behavior through real Hono requests using a narrow fake `AccessGateway`, not mock call counts.

- [x] **Step 2: Run the middleware test and verify failure**

Run: `pnpm vitest run tests/worker/auth-middleware.test.ts`

Expected: FAIL because the access boundary does not exist.

- [x] **Step 3: Implement the Supabase factories and access interface**

Use current `@supabase/supabase-js` APIs with `persistSession: false`, `autoRefreshToken: false`, and bearer-scoped global headers in the Worker. Keep the service-role factory in a server-only module.

- [x] **Step 4: Implement the Hono middleware**

Validate the bearer JWT with Supabase Auth, normalize the verified email, bind an unclaimed active entitlement to that user atomically, then require an active entitlement. Return stable `{ code, message, requestId }` responses without leaking eligibility details.

- [x] **Step 5: Run focused and existing Worker tests**

Run: `pnpm vitest run tests/worker/auth-middleware.test.ts tests/worker/health.test.ts tests/worker/planner-routes.test.ts`

Expected: PASS; health stays public and preview dependencies remain injectable for local tests.

- [x] **Step 6: Commit the authentication boundary**

```bash
git add package.json pnpm-lock.yaml wrangler.jsonc worker-configuration.d.ts src/application/access src/infrastructure/supabase src/worker tests/worker/auth-middleware.test.ts
git commit -m "feat: require entitled Supabase users"
```

---

### Task 3: Email-only access request and browser OTP session

**Files:**
- Create: `src/worker/accessRoutes.ts`
- Create: `src/client/lib/authClient.ts`
- Create: `src/client/features/access/AccessPage.tsx`
- Create: `src/client/features/access/VerifyAccessPage.tsx`
- Create: `src/client/styles/access.css`
- Create: `tests/worker/access-routes.test.ts`
- Create: `tests/client/access-flow.test.tsx`
- Modify: `src/client/main.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/worker/app.ts`

**Interfaces:**
- Produces: `POST /api/access/request` accepting `{ email: string }` and always returning the same success copy for validly shaped requests.
- Produces: `AuthClient.requestOtp(email)`, `AuthClient.verifyOtp(email, token)`, `AuthClient.getSession()`, `AuthClient.onAuthStateChange(listener)`, and `AuthClient.signOut()`.
- Produces: public routes `/activar` and `/verificar`.

- [ ] **Step 1: Write failing access-route tests**

Cover normalized eligible email, ineligible email with identical public response, malformed email, rate limit by hashed email plus origin, and an upstream email-send failure that is logged internally but not exposed. The fake gateway returns outcomes; assertions target HTTP status/body and emitted safe audit fields.

- [ ] **Step 2: Run the access-route test and verify failure**

Run: `pnpm vitest run tests/worker/access-routes.test.ts`

Expected: FAIL because `/api/access/request` does not exist.

- [ ] **Step 3: Implement the access endpoint**

Normalize email, hash email/origin with `ACCESS_RATE_LIMIT_PEPPER`, call `consume_access_attempt`, check an active entitlement, and only then call Supabase `signInWithOtp` with user creation allowed. Return generic success for eligible and ineligible emails; return `429` with neutral copy only after the rate limit is exceeded.

- [ ] **Step 4: Write failing client access tests**

Cover email submission, six-digit OTP validation, verification error, successful session redirect to `/semana`, expired OTP retry, refresh-restored session and sign-out. Assert accessible labels, focus movement, disabled/loading state and the exact absence of any transaction-code field.

- [ ] **Step 5: Run the client access test and verify failure**

Run: `pnpm vitest run tests/client/access-flow.test.tsx`

Expected: FAIL because the auth client and screens do not exist.

- [ ] **Step 6: Implement browser session and screens**

Use the public Supabase URL and publishable key to verify the email OTP with type `email`, persist/refresh the session through Supabase Auth, and retain only the pending normalized email in session storage until verification. Preserve the established cream/teal/terracotta design and 44-pixel targets.

- [ ] **Step 7: Re-run focused tests and commit**

Run: `pnpm vitest run tests/worker/access-routes.test.ts tests/client/access-flow.test.tsx`

Expected: PASS.

```bash
git add src/worker/accessRoutes.ts src/worker/app.ts src/client/lib/authClient.ts src/client/features/access src/client/styles/access.css src/client/main.tsx src/client/app/router.tsx tests/worker/access-routes.test.ts tests/client/access-flow.test.tsx
git commit -m "feat: add email OTP access flow"
```

---

### Task 4: Supabase planner persistence behind the existing repository

**Files:**
- Create: `src/infrastructure/planner/SupabasePlannerRepository.ts`
- Create: `tests/infrastructure/supabase-planner-repository.test.ts`
- Modify: `src/worker/plannerRoutes.ts`
- Modify: `src/worker/app.ts`
- Modify: `src/worker/index.ts`
- Modify: `tests/worker/planner-routes.test.ts`

**Interfaces:**
- Produces: `SupabasePlannerRepository implements PlannerRepository` using the snapshot RPCs.
- Changes: planner routes obtain `userId` from `authorizedUser`; preview mode may still inject `previewUserId` only in development/test.

- [ ] **Step 1: Write failing repository contract tests**

Run the same contract against `InMemoryPlannerRepository` and `SupabasePlannerRepository` with an RPC-level fake: missing preferences/week, save/read preferences, save/read one week, list multiple weeks, preserved manual lines and isolated user ids. Use literal fixtures and reject malformed RPC results through Zod.

- [ ] **Step 2: Run the repository tests and verify failure**

Run: `pnpm vitest run tests/infrastructure/supabase-planner-repository.test.ts`

Expected: FAIL because the Supabase repository does not exist.

- [ ] **Step 3: Implement the repository adapter**

Translate only at the adapter boundary and call the transactional RPCs. Do not duplicate generator or shopping logic; `PlannerService` remains the sole owner of those behaviors.

- [ ] **Step 4: Protect and wire planner routes**

In production, create a request-scoped user client and repository after authorization, then construct `PlannerService` with approved build-time recipes. Keep the current injected preview path for component and browser development.

- [ ] **Step 5: Run repository, service and route suites**

Run: `pnpm vitest run tests/infrastructure/supabase-planner-repository.test.ts tests/application/planner-service.test.ts tests/worker/planner-routes.test.ts`

Expected: PASS with no changes to deterministic plan output.

- [ ] **Step 6: Commit persistent planner wiring**

```bash
git add src/infrastructure/planner/SupabasePlannerRepository.ts src/worker tests/infrastructure/supabase-planner-repository.test.ts tests/worker/planner-routes.test.ts
git commit -m "feat: persist planner data in Supabase"
```

---

### Task 5: Authenticated planner client and private route guard

**Files:**
- Create: `src/client/features/access/AuthProvider.tsx`
- Create: `src/client/features/access/PrivateRoute.tsx`
- Create: `src/client/features/account/AccountPage.tsx`
- Create: `tests/client/private-route.test.tsx`
- Modify: `src/client/lib/plannerClient.ts`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/components/AppShell.tsx`

**Interfaces:**
- Produces: `useAuth()` with `status`, `session`, `user`, `signOut`.
- Changes: `createHttpPlannerClient` requests a current access token and sets `Authorization: Bearer <token>` for every private call.
- Produces: `/cuenta` with purchase email, active-access state and sign-out.

- [ ] **Step 1: Write failing private-route tests**

Cover loading session, anonymous redirect preserving destination, authenticated/entitled render, authenticated but revoked access redirect, token attached to planner calls, token refresh, and sign-out clearing private UI.

- [ ] **Step 2: Run the route test and verify failure**

Run: `pnpm vitest run tests/client/private-route.test.tsx`

Expected: FAIL because the auth provider and guard do not exist.

- [ ] **Step 3: Implement provider, guard and authenticated API client**

Restore the session before rendering private routes, subscribe to auth changes, get the freshest token per API request, and send anonymous users to `/activar`. On `401`, refresh once before signing out; on `403`, show the safe inactive-access state without deleting local session data first.

- [ ] **Step 4: Implement Cuenta and protect the app shell**

Make Semana, Compras, Recetas, Recursos and Cuenta private while keeping Activar/Verificar outside the shell. Cuenta exposes only verified email, access status and sign-out; it must not expose Hotmart transaction data.

- [ ] **Step 5: Run client and existing planner tests**

Run: `pnpm vitest run tests/client/private-route.test.tsx tests/client/access-flow.test.tsx tests/client/week-page.test.tsx tests/client/shopping-page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the private application shell**

```bash
git add src/client/features/access src/client/features/account src/client/lib/plannerClient.ts src/client/app/router.tsx src/client/components/AppShell.tsx tests/client/private-route.test.tsx
git commit -m "feat: protect planner with Supabase sessions"
```

---

### Task 6: Idempotent Hotmart entitlement webhook

**Files:**
- Create: `src/application/access/HotmartEntitlementService.ts`
- Create: `src/worker/hotmartRoutes.ts`
- Create: `tests/application/hotmart-entitlement-service.test.ts`
- Create: `tests/worker/hotmart-routes.test.ts`
- Modify: `src/worker/app.ts`
- Modify: `worker-configuration.d.ts`

**Interfaces:**
- Produces: `POST /api/webhooks/hotmart` for Webhook 2.0 purchase events.
- Produces: `HotmartEntitlementService.process(input)` mapping `PURCHASE_APPROVED`/`PURCHASE_COMPLETE` to `active` and `PURCHASE_REFUNDED`/`PURCHASE_CHARGEBACK` to `revoked`.

- [ ] **Step 1: Write failing service and route tests**

Cover valid activation, refund, chargeback, duplicate event, older event, wrong product, invalid/missing Hottok, malformed body and unsupported event. Compare the Hottok in constant time and assert only safe request/event identifiers are logged—never full payloads, tokens or buyer email.

- [ ] **Step 2: Run the Hotmart tests and verify failure**

Run: `pnpm vitest run tests/application/hotmart-entitlement-service.test.ts tests/worker/hotmart-routes.test.ts`

Expected: FAIL because the webhook does not exist.

- [ ] **Step 3: Implement schema validation and event mapping**

Parse only `id`, `creation_date`, `event`, `data.product.ucode`, `data.buyer.email` and `data.purchase.transaction`. Reject an unexpected product before persistence and normalize email at the boundary.

- [ ] **Step 4: Persist through the idempotent database RPC**

Call `process_hotmart_event` with the event id, event timestamp, provider transaction, product code, normalized email and mapped state. Return `204` for a processed or duplicate supported event so Hotmart retries do not create duplicate work.

- [ ] **Step 5: Re-run Hotmart and auth tests**

Run: `pnpm vitest run tests/application/hotmart-entitlement-service.test.ts tests/worker/hotmart-routes.test.ts tests/worker/auth-middleware.test.ts tests/worker/access-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Hotmart entitlement processing**

```bash
git add src/application/access/HotmartEntitlementService.ts src/worker/hotmartRoutes.ts src/worker/app.ts worker-configuration.d.ts tests/application/hotmart-entitlement-service.test.ts tests/worker/hotmart-routes.test.ts
git commit -m "feat: process Hotmart entitlement events"
```

---

### Task 7: End-to-end access and persistence verification

**Files:**
- Create: `e2e/access-planner-journey.spec.ts`
- Create: `.dev.vars.example`
- Create: `docs/operations/supabase-hotmart-setup.md`
- Modify: `scripts/verify-production-bundle.mjs`
- Modify: `docs/superpowers/plans/2026-10-19-access-supabase-hotmart-implementation.md`

**Interfaces:**
- Produces: a fake external-services harness for browser CI and a manual checklist for one real Supabase/Hotmart sandbox verification.
- Produces: documented Worker secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `HOTMART_PRODUCT_UCODE`, and `ACCESS_RATE_LIMIT_PEPPER`; browser variables contain only the URL and publishable key.

- [ ] **Step 1: Write the failing browser journey**

At 375x667, request access with purchase email, enter OTP, complete preferences, generate a week, replace one recipe, check and add shopping items, reload, verify persistence, open Cuenta and sign out. Add anonymous direct-route redirect and revoked-entitlement cases. Run against deterministic fake adapters; do not label it a real Hotmart/Supabase test.

- [ ] **Step 2: Run the journey and verify failure**

Run: `pnpm playwright test e2e/access-planner-journey.spec.ts`

Expected: FAIL on the first missing integration behavior.

- [ ] **Step 3: Complete only wiring exposed by the journey**

Fix session, route, request or responsive integration defects without adding landing, resources, analytics or unrelated launch work.

- [ ] **Step 4: Document external setup and rollback**

Document migration application, Auth email OTP template, allowed redirect URLs, Worker/public variables, Hotmart Webhook 2.0 URL/events, product code, secret rotation, entitlement audit, webhook replay and rollback. State explicitly that real activation requires credentials and a test purchase/refund.

- [ ] **Step 5: Run the complete automated gate**

Run: `pnpm test`

Expected: all Vitest tests PASS.

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: production build succeeds, unapproved recipes stay excluded and no service-role/Hottok value or secret name is present in browser assets.

Run: `pnpm playwright test`

Expected: all browser journeys PASS.

- [ ] **Step 6: Run the real-integration activation gate when credentials exist**

Apply migrations to the development Supabase project; configure Worker secrets; send one signed Hotmart test event; request and verify a real OTP; persist a week; send a duplicate event; then refund/revoke and verify `403`. Capture identifiers and timestamps but no secrets or complete buyer data.

- [ ] **Step 7: Mark verified steps and commit**

Only mark the real-integration step complete after the external evidence exists; automated fake-adapter success must not substitute for it.

```bash
git add e2e/access-planner-journey.spec.ts .dev.vars.example docs/operations/supabase-hotmart-setup.md scripts/verify-production-bundle.mjs docs/superpowers/plans/2026-10-19-access-supabase-hotmart-implementation.md
git commit -m "test: verify access and persistence increment"
```

## Handoff to Increment D

After the automated gate and one real purchase/refund rehearsal pass, merge this increment. Landing, approved resources, legal pages, custom domain, SMTP hardening and launch analytics remain a separate plan.
