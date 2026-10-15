# Planner and Shopping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete local preview of weekly meal planning and derived shopping lists through the real HTTP boundary, ready for Supabase-backed persistence in the next increment.

**Architecture:** Shared domain functions generate deterministic weekly plans and consolidate shopping quantities without depending on React, Hono, or storage. A `PlannerRepository` port and `PlannerService` own mutations; the Worker exposes the approved API contract using an in-memory adapter only while `import.meta.env.DEV` is true, and production returns a generic feature-unavailable response until authenticated Supabase persistence exists. React consumes only an HTTP `PlannerClient`, so Increment C can replace identity and storage without rewriting Semana or Compras.

**Tech Stack:** TypeScript, Zod, React, React Router, Hono, Vitest, Testing Library, Playwright, Cloudflare Vite plugin

**Spec:** `docs/superpowers/specs/2026-10-15-full-app-visual-backend-design.md`

## Global Constraints

- This is a recipe, weekly-planning and shopping product; it must not collect glucose, insulin, medication, weight, symptoms or other daily clinical-control data.
- Planned meal types are exactly `breakfast`, `lunch`, `dinner` and `snack`; dessert remains catalog-only in this increment.
- Only recipes visible through the existing publication boundary may be planned.
- Generation is deterministic for preview user, Monday week start and generator version.
- Replacing one meal must not alter any other weekly item.
- Shopping quantities combine only the same canonical ingredient and compatible unit; `to_taste` remains separate.
- Manual shopping items survive regeneration and recipe replacement.
- Preview persistence is explicitly non-durable and development-only; production planner routes return `FEATURE_UNAVAILABLE` until Supabase and authorization ship.
- No Supabase, OTP, Hotmart entitlement, webhook or private-route claim is implemented in this increment.
- Spanish interface copy remains clear, non-clinical and usable at 375 px and 125 percent text.

## Review Focus

- A week with five snack recipes still fills seven enabled snack slots deterministically with the minimum possible repetition and explains the limitation.
- Excluding every recipe for one enabled meal type leaves only those slots unavailable and preserves the rest of the week.
- Replacing one recipe recalculates only its shopping contribution while retaining checkmarks and manual lines.
- Reloading during the same development-server process returns the same preview week; a production build cannot activate anonymous planner writes.
- Decimal, `to_taste`, and incompatible-unit ingredients remain readable and are never combined incorrectly.

---

### Task 1: Planner schemas and canonical ingredient catalog

**Files:**
- Create: `content/ingredients/catalog.json`
- Create: `src/domain/ingredients/ingredientCatalog.ts`
- Create: `src/domain/planner/planner.ts`
- Modify: `src/domain/recipes/recipeRepository.ts`
- Modify: `src/infrastructure/recipes/jsonRecipeRepository.ts`
- Create: `tests/content/ingredient-catalog.test.ts`
- Create: `tests/domain/planner-schema.test.ts`
- Modify: `tests/domain/recipe-search.test.ts`

**Interfaces:**
- Produces: `ShoppingCategory`, `IngredientCatalogEntry`, `ingredientCatalogSchema`, `PlannerPreferences`, `WeeklyPlan`, `WeeklyPlanItem`, `ShoppingListItem`, and their Zod schemas.
- Produces: `RecipeRepository.getById(id: string, options?: { includeDrafts?: boolean }): Promise<Recipe | null>`.

- [ ] **Step 1: Write failing catalog and planner schema tests**

Assert that every `ingredientId` used by the 45 source recipes has exactly one catalog entry with a Spanish label and one of `produce`, `protein`, `dairy`, `pantry`, `bakery`, `frozen` or `other`. Assert preferences reject zero people, dessert as a planned meal, invalid exclusions and non-Monday week starts.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm vitest run tests/content/ingredient-catalog.test.ts tests/domain/planner-schema.test.ts`

Expected: FAIL because the catalog and planner schemas do not exist.

- [ ] **Step 3: Add the canonical catalog and planner contracts**

Define the exact domain types in `planner.ts`. `PlannerPreferences` contains `people: number`, `enabledMeals: PlannedMealType[]`, and `excludedIngredientIds: string[]`. `WeeklyPlan` contains stable `id`, `weekStart`, `people`, `generatorVersion`, `items`, and `notices`. Each `WeeklyPlanItem` contains `id`, ISO `date`, `mealType`, `recipeId`, `servings`, and `replaced`.

`ShoppingListItem` is a discriminated union. Generated items contain `source: "generated"`, stable `id`, `ingredientId`, `label`, numeric-or-null `quantity`, `unit`, `category`, and `checked`. Manual items contain `source: "manual"`, stable `id`, `label`, optional numeric `quantity`, optional free-text `unitLabel`, `category`, and `checked`. Both schemas reject blank labels and non-positive supplied quantities.

- [ ] **Step 4: Extend the recipe repository with identifier lookup**

Implement `getById` with the same publication rules as `getBySlug`; cover approved, preview-draft and missing cases.

- [ ] **Step 5: Run focused tests and verify success**

Run: `pnpm vitest run tests/content/ingredient-catalog.test.ts tests/domain/planner-schema.test.ts tests/domain/recipe-search.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the domain contracts**

```bash
git add content/ingredients/catalog.json src/domain/ingredients/ingredientCatalog.ts src/domain/planner/planner.ts src/domain/recipes/recipeRepository.ts src/infrastructure/recipes/jsonRecipeRepository.ts tests/content/ingredient-catalog.test.ts tests/domain/planner-schema.test.ts tests/domain/recipe-search.test.ts
git commit -m "feat: define planner and ingredient contracts"
```

---

### Task 2: Deterministic weekly generator

**Files:**
- Create: `src/domain/planner/generateWeeklyPlan.ts`
- Create: `tests/domain/weekly-plan-generator.test.ts`

**Interfaces:**
- Consumes: `PlannerPreferences`, recipe arrays and stable recipe identifiers from Task 1.
- Produces: `generateWeeklyPlan(input: GenerateWeeklyPlanInput): WeeklyPlan` and `GENERATOR_VERSION`.

- [ ] **Step 1: Write failing generator tests**

Cover identical output for identical seed/week/version, changed output for another week, exact enabled meal types, exclusion filtering, no cross-category recipes, recent-recipe penalty, primary-ingredient variety, and stable item identifiers. Add the Review Focus cases for five snacks across seven days and one category with zero compatible recipes.

- [ ] **Step 2: Run the generator test and verify failure**

Run: `pnpm vitest run tests/domain/weekly-plan-generator.test.ts`

Expected: FAIL because `generateWeeklyPlan` does not exist.

- [ ] **Step 3: Implement deterministic best-effort generation**

Use a stable string hash plus seeded selection. Iterate dates Monday through Sunday and enabled meals in `breakfast`, `lunch`, `dinner`, `snack` order. Prefer unused recipes, then least-used recipes with the longest distance from their prior slot; penalize `recentRecipeIds` and same-day primary ingredients. When candidates exist but are fewer than seven, repeat minimally and add a Spanish notice. When no candidates exist, omit only that meal type's slots and add a limiting-preference notice.

- [ ] **Step 4: Run generator tests and verify success**

Run: `pnpm vitest run tests/domain/weekly-plan-generator.test.ts`

Expected: PASS with deterministic snapshots generated from explicit fixtures, not the mutable 45-recipe source file.

- [ ] **Step 5: Commit the generator**

```bash
git add src/domain/planner/generateWeeklyPlan.ts tests/domain/weekly-plan-generator.test.ts
git commit -m "feat: generate deterministic weekly plans"
```

---

### Task 3: Shopping-list consolidation

**Files:**
- Create: `src/domain/planner/buildShoppingList.ts`
- Create: `tests/domain/shopping-list.test.ts`

**Interfaces:**
- Consumes: `WeeklyPlan`, planned recipes and the canonical ingredient catalog.
- Produces: `buildShoppingList(input: BuildShoppingListInput): ShoppingListItem[]` and `shoppingLineKey(ingredientId: string, unit: IngredientUnit): string`.

- [ ] **Step 1: Write failing shopping aggregation tests**

Assert serving-scale arithmetic, same-ID/same-unit summation, incompatible-unit separation, stable generated keys, catalog grouping, readable decimal rounding, and separate `to_taste` lines. Assert previous checked state is retained by stable key and manual items remain untouched after plan changes.

- [ ] **Step 2: Run the shopping test and verify failure**

Run: `pnpm vitest run tests/domain/shopping-list.test.ts`

Expected: FAIL because shopping consolidation does not exist.

- [ ] **Step 3: Implement pure consolidation**

Generated lines use `generated:<ingredientId>:<unit>` keys and manual lines use `manual:<uuid>`. Scale measured amounts by `item.servings / recipe.servingsBase`, round only for display, never convert between units, and preserve raw numeric totals. `to_taste` lines have `quantity: null` and never merge with measured units.

- [ ] **Step 4: Run shopping tests and verify success**

Run: `pnpm vitest run tests/domain/shopping-list.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit shopping consolidation**

```bash
git add src/domain/planner/buildShoppingList.ts tests/domain/shopping-list.test.ts
git commit -m "feat: consolidate weekly shopping lists"
```

---

### Task 4: Planner repository, service and development-only API

**Files:**
- Create: `src/application/planner/PlannerRepository.ts`
- Create: `src/application/planner/PlannerService.ts`
- Create: `src/infrastructure/planner/InMemoryPlannerRepository.ts`
- Create: `src/worker/plannerRoutes.ts`
- Modify: `src/worker/app.ts`
- Modify: `src/worker/index.ts`
- Modify: `src/virtual-recipe-content.d.ts`
- Create: `tests/application/planner-service.test.ts`
- Create: `tests/worker/planner-routes.test.ts`

**Interfaces:**
- Produces: `PlannerRepository` CRUD port scoped by `userId` and `weekStart`.
- Produces: `PlannerService` methods `getOrGenerateWeek`, `regenerateWeek`, `replaceItem`, `updatePreferences`, `getShoppingList`, `patchShoppingItem`, `addManualShoppingItem`, and `deleteManualShoppingItem`.
- Produces: the API routes from sections 9 and 10 of the spec with `{ data }` success envelopes and `{ code, message, requestId }` errors.

The exact Increment B surface is `GET /api/me`, `PATCH /api/me/preferences`, `GET /api/weeks/:weekStart`, `POST /api/weeks/:weekStart/regenerate`, `PUT /api/weeks/:weekStart/items/:itemId`, `GET /api/weeks/:weekStart/shopping-list`, `PATCH /api/weeks/:weekStart/shopping-list/:itemId`, `POST /api/weeks/:weekStart/shopping-list`, and `DELETE /api/weeks/:weekStart/shopping-list/:itemId`.

- [ ] **Step 1: Write failing service tests**

Cover first-read generation, repeat-read identity, explicit regeneration confirmation, single-item replacement, people-change confirmation, shopping recalculation, checkmark retention, manual-item retention, and rejection of replacements from the wrong meal category.

- [ ] **Step 2: Run service tests and verify failure**

Run: `pnpm vitest run tests/application/planner-service.test.ts`

Expected: FAIL because the repository and service are absent.

- [ ] **Step 3: Implement repository and service boundaries**

Keep the in-memory adapter clone-safe so callers cannot mutate stored plans by reference. Regeneration and people changes require `{ confirmed: true }` when a week already exists. Replacement uses the same compatibility/exclusion checks as generation and updates only the selected item before rebuilding generated shopping lines.

- [ ] **Step 4: Run service tests and verify success**

Run: `pnpm vitest run tests/application/planner-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing Worker contract tests**

Test `PATCH /api/me/preferences`, all `/api/weeks/:weekStart` and shopping routes, request validation, stable errors and `requestId`. Verify the Review Focus boundary: when `plannerPreview` is false, every planner mutation and read returns HTTP 503 with `FEATURE_UNAVAILABLE`; no caller-provided user ID can select another preview user's state.

- [ ] **Step 6: Implement development-only planner routes**

`createWorkerApp(dependencies?: WorkerAppDependencies)` receives the repository, recipes, ingredient catalog, `plannerPreview`, and a server-owned `previewUserId`. `src/worker/index.ts` constructs the in-memory adapter only when `import.meta.env.DEV` is true. Production builds wire no preview repository and cannot enable anonymous writes from headers or request bodies.

- [ ] **Step 7: Run Worker tests and verify success**

Run: `pnpm vitest run tests/worker/health.test.ts tests/worker/planner-routes.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit service and API boundaries**

```bash
git add src/application/planner src/infrastructure/planner src/worker/app.ts src/worker/index.ts src/worker/plannerRoutes.ts src/virtual-recipe-content.d.ts tests/application/planner-service.test.ts tests/worker/planner-routes.test.ts
git commit -m "feat: expose preview planner api"
```

---

### Task 5: HTTP client and weekly-plan interface

**Files:**
- Create: `src/client/lib/plannerClient.ts`
- Create: `src/client/features/planner/PreferencesForm.tsx`
- Create: `src/client/features/planner/WeekPage.tsx`
- Create: `src/client/features/planner/WeekMealCard.tsx`
- Create: `src/client/features/planner/RecipeReplacementDialog.tsx`
- Modify: `src/client/app/router.tsx`
- Create: `src/client/styles/planner.css`
- Modify: `src/client/main.tsx`
- Create: `tests/client/preferences-form.test.tsx`
- Create: `tests/client/week-page.test.tsx`

**Interfaces:**
- Consumes: Task 4 API only through `PlannerClient`; React components do not import the in-memory repository or generator.
- Produces: `createHttpPlannerClient(fetcher?: typeof fetch): PlannerClient` and the live `/semana` route.

- [ ] **Step 1: Write failing preference and week component tests**

Cover people 1–12, at least one enabled meal, searchable ingredient exclusions, loading, first-week generation, partial-plan notice, retryable error, previous/next week, explicit regeneration confirmation, single-card replacement and people-change confirmation. Assert all controls retain 44 px targets and meaningful accessible names.

- [ ] **Step 2: Run client tests and verify failure**

Run: `pnpm vitest run tests/client/preferences-form.test.tsx tests/client/week-page.test.tsx`

Expected: FAIL because the planner UI does not exist.

- [ ] **Step 3: Implement the typed HTTP client**

Validate responses with Task 1 Zod schemas. Throw `PlannerClientError` with only safe `code`, `message`, `requestId`, and HTTP status. Use `AbortSignal` so route changes cannot write stale responses into the page.

- [ ] **Step 4: Implement Semana**

Show an onboarding/preferences panel before the first generation. The ready state groups cards by day, retains the approved navigation shell, exposes notices without alarm styling, and replaces one item through a category-compatible dialog. Use native confirmation UI in React, never `window.confirm`, so tests and accessibility remain deterministic.

- [ ] **Step 5: Run client tests and verify success**

Run: `pnpm vitest run tests/client/preferences-form.test.tsx tests/client/week-page.test.tsx tests/client/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the weekly interface**

```bash
git add src/client/lib/plannerClient.ts src/client/features/planner src/client/app/router.tsx src/client/styles/planner.css src/client/main.tsx tests/client/preferences-form.test.tsx tests/client/week-page.test.tsx
git commit -m "feat: add interactive weekly planner"
```

---

### Task 6: Shopping-list interface

**Files:**
- Create: `src/client/features/shopping/ShoppingPage.tsx`
- Create: `src/client/features/shopping/ShoppingGroup.tsx`
- Create: `src/client/features/shopping/ManualShoppingItemForm.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/styles/planner.css`
- Create: `tests/client/shopping-page.test.tsx`

**Interfaces:**
- Consumes: `PlannerClient` and stable shopping keys from Tasks 3 and 5.
- Produces: the live `/compras` route with grouped generated and manual items.

- [ ] **Step 1: Write failing shopping page tests**

Cover grouped rendering, measured and `to_taste` copy, optimistic check/uncheck with rollback on error, manual add/delete, generated-item delete prohibition, empty week guidance, loading, retry and offline states. Assert replacing a recipe through the mocked client changes generated lines but leaves manual lines and matching checked keys intact.

- [ ] **Step 2: Run the shopping component test and verify failure**

Run: `pnpm vitest run tests/client/shopping-page.test.tsx`

Expected: FAIL because the shopping page does not exist.

- [ ] **Step 3: Implement Compras**

Render groups in `produce`, `protein`, `dairy`, `bakery`, `pantry`, `frozen`, `other` order with natural Spanish labels. Generated items may be checked but not deleted; manual items may be checked, edited through the allowed patch fields and deleted. Announce save failures through an `aria-live` region and restore the previous optimistic state.

- [ ] **Step 4: Run shopping and shell tests and verify success**

Run: `pnpm vitest run tests/client/shopping-page.test.tsx tests/client/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the shopping interface**

```bash
git add src/client/features/shopping src/client/app/router.tsx src/client/styles/planner.css tests/client/shopping-page.test.tsx
git commit -m "feat: add derived shopping list"
```

---

### Task 7: Planner journey and full verification

**Files:**
- Create: `e2e/planner-shopping-journey.spec.ts`
- Modify: `e2e/recipe-responsive.spec.ts`
- Modify: `docs/superpowers/plans/2026-10-15-planner-shopping-implementation.md`

**Interfaces:**
- Consumes: the completed preview API, Semana and Compras routes.
- Produces: browser evidence for the whole Increment B and a completed plan checklist.

- [ ] **Step 1: Write the failing end-to-end journey**

At 375x667, configure two people with all four meal types, generate the week, verify seven days and a visible snack plan, replace one meal, open Compras, check a generated line, add a manual line, reload and verify both states remain during the same server process. Repeat the critical page-overflow assertions at 125 percent root text.

- [ ] **Step 2: Run the journey and verify failure before final wiring**

Run: `pnpm playwright test e2e/planner-shopping-journey.spec.ts`

Expected: FAIL on the first missing or incomplete integration behavior.

- [ ] **Step 3: Complete only the wiring exposed by the journey**

Fix route-state, request or responsive integration defects without adding Supabase or access behavior.

- [ ] **Step 4: Run the complete verification suite**

Run: `pnpm test`

Expected: all Vitest tests PASS.

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: production build succeeds, unapproved recipes remain excluded, and planner preview routes remain unavailable in the production Worker configuration.

Run: `pnpm playwright test`

Expected: all recipe and planner journeys PASS.

- [ ] **Step 5: Mark checklist items only after their evidence exists**

Replace `[ ]` with `[x]` only for completed steps whose commands produced the expected result.

- [ ] **Step 6: Commit Increment B verification**

```bash
git add e2e/planner-shopping-journey.spec.ts e2e/recipe-responsive.spec.ts docs/superpowers/plans/2026-10-15-planner-shopping-implementation.md
git commit -m "test: verify planner and shopping increment"
```

## Handoff to Increment C

After this plan is green, preserve the `PlannerRepository`, `PlannerService`, and `PlannerClient` interfaces. The next approved plan replaces preview identity and in-memory storage with Supabase Auth, PostgreSQL/RLS and Hotmart-backed entitlements; it must not fork the planner domain or duplicate generation and shopping logic.
