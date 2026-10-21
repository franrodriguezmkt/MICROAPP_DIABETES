# Landing, Resources and Launch Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the public commercial surface, private educational resource library and legal/account links while keeping checkout, PDF publication and SMTP activation safely configurable for launch.

**Architecture:** Keep the existing React Router, protected app shell and Cloudflare deployment. Add versioned static resource metadata, public landing/legal routes outside the auth guard, and a build-time Hotmart checkout boundary that only accepts HTTPS Hotmart URLs; leave missing or unapproved external assets visibly unavailable instead of inventing links. Document Brevo as the preferred Supabase SMTP provider without coupling application code to one mail vendor.

**Tech Stack:** React, React Router, TypeScript, Zod, CSS, Vitest, Testing Library, Playwright, Vite and Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-10-15-full-app-visual-backend-design.md`

## Global Constraints

- Keep `Semana`, `Compras`, `Recetas`, `Recursos` and `Cuenta` private and preserve their current URLs.
- Publish the landing at `/`; keep `/activar` and `/verificar` public.
- Never present the product as medical diagnosis, treatment or personalized clinical guidance.
- Only expose an active external link when it is HTTPS and belongs to a Hotmart host.
- Never publish a resource PDF until its metadata is explicitly `approved` and a local file path exists.
- Preserve the warm cream, deep teal and terracotta visual system, 44-pixel targets, visible focus, reduced motion and 375-pixel support.
- Keep SMTP provider details out of browser code; Supabase remains the OTP sender and Brevo is configured only as its SMTP relay.
- Continue on the current free `workers.dev` host; a custom domain remains a launch-day operation.

## Review Focus

- A missing checkout URL leaves a clear non-clickable state and never creates an empty or unsafe link.
- A malformed, non-HTTPS or non-Hotmart checkout URL is rejected even when supplied through the build environment.
- A resource marked pending, or approved without a local file, cannot expose a download control.
- Public visitors can reach landing and legal pages without being redirected to activation, while private routes still require a session.
- Long Spanish copy at 375 pixels and 125 percent text produces no page-level horizontal overflow or hidden calls to action.

---

### Task 1: Safe Hotmart checkout boundary and public landing

**Files:**
- Create: `src/client/lib/checkout.ts`
- Create: `src/client/features/landing/LandingPage.tsx`
- Create: `src/client/styles/landing.css`
- Create: `tests/client/landing-page.test.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/main.tsx`
- Modify: `.env.example`

**Interfaces:**
- Produces: `parseHotmartCheckoutUrl(value: string | undefined): string | null`.
- Produces: `LandingPage({ checkoutUrl? }: { checkoutUrl?: string | null }): JSX.Element`; omission reads `VITE_HOTMART_CHECKOUT_URL` through the safe parser.
- Changes: `/` becomes public; authenticated application URLs remain unchanged.

- [ ] **Step 1: Write failing landing tests**

Add tests named `renders_the_complete_product_story_for_public_visitors`, `uses_only_a_valid_https_hotmart_checkout`, `keeps_purchase_unavailable_without_a_safe_checkout`, and `keeps_activation_as_a_separate_existing_buyer_action`. Assert the product value, week/shopping/recipe demonstrations, inclusion list, process, educational notice, FAQ, valid CTA, invalid URL rejection and `/activar` link.

- [ ] **Step 2: Run the landing test and verify failure**

Run: `pnpm vitest run tests/client/landing-page.test.tsx`

Expected: FAIL because the landing and checkout parser do not exist.

- [ ] **Step 3: Implement the safe checkout parser and landing**

Accept only `https:` URLs whose hostname is `hotmart.com` or ends in `.hotmart.com`. Compose the landing from semantic sections, one `h1`, descriptive CTA copy and the existing `BrandMark`; when configuration is absent or invalid, render a status message instead of an anchor.

- [ ] **Step 4: Expose the public route and responsive styles**

Move the private index redirect under the protected shell and register `/` before `AuthProvider`. Import `landing.css` after shared styles and document `VITE_HOTMART_CHECKOUT_URL` as public configuration, never a secret.

- [ ] **Step 5: Run focused tests and commit**

Run: `pnpm vitest run tests/client/landing-page.test.tsx tests/client/private-route.test.tsx`

Expected: PASS and private route behavior remains unchanged.

```bash
git add .env.example src/client/lib/checkout.ts src/client/features/landing/LandingPage.tsx src/client/styles/landing.css src/client/app/router.tsx src/client/main.tsx tests/client/landing-page.test.tsx
git commit -m "feat: add public Hotmart landing"
```

---

### Task 2: Reviewed-resource contract and private library

**Files:**
- Create: `content/resources/resources.json`
- Create: `src/domain/resources/resource.ts`
- Create: `src/client/features/resources/ResourcesPage.tsx`
- Create: `src/client/styles/resources.css`
- Create: `tests/domain/resource-schema.test.ts`
- Create: `tests/client/resources-page.test.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/main.tsx`

**Interfaces:**
- Produces: `EducationalResource` with stable `id`, `title`, `summary`, `kind`, `publicationStatus` and optional local `downloadPath`.
- Produces: `parseEducationalResources(input: unknown): EducationalResource[]`; approved resources require `/resources/<slug>.pdf`, pending resources must not contain a path.
- Produces: `ResourcesPage({ resources? }: { resources?: EducationalResource[] }): JSX.Element` using versioned metadata by default.

- [ ] **Step 1: Write failing resource schema tests**

Add tests that accept the four known resource records as pending, accept an approved local PDF, reject remote/traversal/non-PDF paths, reject approved entries without a path and reject pending entries with a path.

- [ ] **Step 2: Run the schema test and verify failure**

Run: `pnpm vitest run tests/domain/resource-schema.test.ts`

Expected: FAIL because the resource contract does not exist.

- [ ] **Step 3: Implement metadata and schema**

Create pending records for Manual de intercambio de alimentos, Planeadores, Guía de ejercicios and Prevención del pie diabético. Validate the discriminated publication contract with Zod and expose parsed read-only content.

- [ ] **Step 4: Write failing resource-library tests**

Add `shows_all_four_resources_with_educational_context`, `prevents_pending_resource_downloads`, and `exposes_only_an_approved_local_pdf`. Assert headings, kind labels, review state, no pending anchors and `download` for the approved fixture.

- [ ] **Step 5: Run the page test and verify failure**

Run: `pnpm vitest run tests/client/resources-page.test.tsx`

Expected: FAIL because the route still renders the placeholder.

- [ ] **Step 6: Implement the resource library and route**

Replace the `/recursos` placeholder with responsive cards. Use plain educational copy, explicit professional-review status and no medical promises. Import focused styles in `main.tsx`.

- [ ] **Step 7: Run focused tests and commit**

Run: `pnpm vitest run tests/domain/resource-schema.test.ts tests/client/resources-page.test.tsx`

Expected: PASS.

```bash
git add content/resources src/domain/resources src/client/features/resources src/client/styles/resources.css src/client/app/router.tsx src/client/main.tsx tests/domain/resource-schema.test.ts tests/client/resources-page.test.tsx
git commit -m "feat: add guarded educational resources"
```

---

### Task 3: Public legal pages and account access

**Files:**
- Create: `src/client/features/legal/LegalPage.tsx`
- Create: `src/client/styles/legal.css`
- Create: `tests/client/legal-pages.test.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/features/account/AccountPage.tsx`
- Modify: `src/client/features/access/AccessPage.tsx`
- Modify: `src/client/main.tsx`

**Interfaces:**
- Produces: `LegalPage({ type }: { type: "privacy" | "terms" | "educational" }): JSX.Element`.
- Produces public routes `/privacidad`, `/terminos` and `/aviso-educativo`.

- [ ] **Step 1: Write failing legal-route tests**

Cover public rendering without auth, product/data boundaries in privacy, acceptable-use/refund-platform boundaries in terms, and the exact educational distinction that the app does not replace professional medical advice. Assert Cuenta and Activar expose reachable legal links.

- [ ] **Step 2: Run the legal test and verify failure**

Run: `pnpm vitest run tests/client/legal-pages.test.tsx`

Expected: FAIL because the legal pages and links do not exist.

- [ ] **Step 3: Implement the pages and links**

Use Spanish, dated, readable sections with no invented company registration, address, phone or medical credentials. State which services process data (Cloudflare, Supabase, Hotmart and the configured transactional mail provider) without embedding secret configuration.

- [ ] **Step 4: Run focused tests and commit**

Run: `pnpm vitest run tests/client/legal-pages.test.tsx tests/client/access-flow.test.tsx tests/client/private-route.test.tsx`

Expected: PASS.

```bash
git add src/client/features/legal src/client/styles/legal.css src/client/app/router.tsx src/client/features/account/AccountPage.tsx src/client/features/access/AccessPage.tsx src/client/main.tsx tests/client/legal-pages.test.tsx
git commit -m "feat: publish legal and educational notices"
```

---

### Task 4: Brevo launch runbook and public journey verification

**Files:**
- Create: `docs/operations/brevo-supabase-smtp.md`
- Create: `e2e/launch-surfaces-journey.spec.ts`
- Modify: `docs/operations/supabase-hotmart-setup.md`
- Modify: `docs/superpowers/plans/2026-10-21-launch-surfaces-implementation.md`

**Interfaces:**
- Produces: an operational checklist for domain authentication, Brevo SMTP relay, Supabase custom SMTP, OTP template and rollback.
- Produces: a public browser journey covering landing, safe purchase state, public legal pages and private resource access.

- [ ] **Step 1: Write the failing browser journey**

At 375 by 667 and desktop, assert public landing access, complete section landmarks, valid configured checkout behavior in the test server, legal navigation, anonymous `/recursos` redirect, authenticated resource cards, 44-pixel actions and no horizontal overflow at 125 percent text.

- [ ] **Step 2: Run the journey and verify failure**

Run: `pnpm playwright test e2e/launch-surfaces-journey.spec.ts`

Expected: FAIL on the first missing launch-surface behavior.

- [ ] **Step 3: Complete only integration issues exposed by the journey**

Correct routing, accessibility or responsive behavior without weakening assertions or publishing pending resources.

- [ ] **Step 4: Document Brevo and the remaining external gates**

Record that Brevo is the preferred SMTP relay, Supabase remains responsible for OTP generation, the sender domain must be authenticated, the template must include `{{ .Token }}`, secrets live only in Supabase/Brevo, and launch still requires one real OTP plus purchase/refund journey. Do not claim current plan limits as guaranteed; link the official Brevo limit page.

- [ ] **Step 5: Run the complete verification suite**

Run: `pnpm test`

Expected: all Vitest tests PASS.

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: production build succeeds and excludes unapproved recipes.

Run: `pnpm playwright test`

Expected: all browser journeys PASS.

- [ ] **Step 6: Mark verified steps and commit**

```bash
git add docs/operations docs/superpowers/plans/2026-10-21-launch-surfaces-implementation.md e2e/launch-surfaces-journey.spec.ts
git commit -m "test: verify launch surfaces"
```

## External launch gates left intentionally open

- Obtain and configure the exact Hotmart checkout URL for product `8770845`.
- Add a dedicated product domain or subdomain and authenticate it in Brevo.
- Configure Brevo SMTP credentials inside Supabase Auth and change the email template to `{{ .Token }}`.
- Add only professionally reviewed PDF files to `public/resources` and change their metadata to `approved` in the same reviewed commit.
- Execute one real purchase, OTP, persisted week, refund and revoked-access journey before public launch.
