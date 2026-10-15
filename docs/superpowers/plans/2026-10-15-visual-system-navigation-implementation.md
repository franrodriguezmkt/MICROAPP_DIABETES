# Visual System and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current functional shell with the approved warm editorial interface, expose Snack as a first-class recipe filter, and establish reusable responsive components for the remaining product areas.

**Architecture:** Keep the existing React Router and recipe repository boundaries. Introduce focused SVG identity and media components, split layout styles from recipe styles, and keep image paths optional so the app remains complete before the 45 Flow images arrive.

**Tech Stack:** React, React Router, TypeScript, Zod, CSS, Vitest, Testing Library, Playwright, Vite, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-10-15-full-app-visual-backend-design.md`

## Global Constraints

- Preserve the navigation order and copy: Semana, Compras, Recetas, Recursos and Cuenta.
- Preserve the existing route URLs and recipe repository behavior.
- Show recipe categories as Todas, Desayunos, Almuerzos, Cenas, Snacks and Postres.
- Keep every recipe whose `publicationStatus` is not `approved` out of production bundles.
- Use cream surfaces, deep teal structure and terracotta accents; do not use medical symbols.
- Use only SVG icons for structural UI; no emoji icons.
- Keep interactive targets at least 44 by 44 CSS pixels.
- Support 375 px portrait, landscape, 125 percent root text and `prefers-reduced-motion`.
- A missing recipe image must produce a stable editorial placeholder and never block recipe text.
- Do not add Supabase, Hotmart or planner behavior in this increment; later plans consume the components created here.

## Review Focus

- A recipe with no `imagePath` renders the category placeholder without a broken-image indicator.
- Long Spanish recipe titles and all six filter labels remain reachable at 375 px and 125 percent text without horizontal page overflow.
- The fixed mobile navigation respects bottom safe-area space and never covers the final recipe card.
- Keyboard users receive visible focus and the active route remains exposed through `aria-current="page"`.
- Reduced-motion users receive no decorative transition or transform animation.

---

### Task 1: Brand and navigation primitives

**Files:**
- Create: `src/client/components/BrandMark.tsx`
- Create: `src/client/components/AppIcon.tsx`
- Modify: `src/client/components/AppShell.tsx`
- Create: `tests/client/app-shell.test.tsx`

**Interfaces:**
- Consumes: React Router `NavLink` and `Outlet`.
- Produces: `BrandMark({ className?: string }): JSX.Element`; `AppIcon({ name, className? }): JSX.Element` where `name` is `"week" | "shopping" | "recipes" | "resources" | "account"`; `AppShell(): JSX.Element` with unchanged routes.

- [ ] **Step 1: Write failing shell tests**

Add tests named `shows_the_five_destinations_in_the_approved_order`, `marks_the_current_destination_semantically`, and `keeps_navigation_icons_decorative`. Assert the five labels in order, `aria-current="page"` for `/recetas`, and `aria-hidden="true"` on each icon SVG.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm vitest run tests/client/app-shell.test.tsx`

Expected: FAIL because the icon primitives and new shell semantics do not exist.

- [ ] **Step 3: Create the visual primitives**

Implement `BrandMark` as an inline SVG combining a rounded calendar tile, plate ring and leaf. Implement `AppIcon` with one consistent 1.75-stroke SVG family for calendar, checked list, utensils, open book and user. Every SVG uses `currentColor`, has `focusable="false"`, and is decorative.

- [ ] **Step 4: Recompose `AppShell` without changing routes**

Use a `.app-sidebar` region on desktop and `.app-navigation` for the shared nav element. Each `NavLink` contains `AppIcon` and a text label. Keep the skip link and `main#main-content` target.

- [ ] **Step 5: Run the focused test and verify success**

Run: `pnpm vitest run tests/client/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the semantic shell**

```bash
git add src/client/components/BrandMark.tsx src/client/components/AppIcon.tsx src/client/components/AppShell.tsx tests/client/app-shell.test.tsx
git commit -m "feat: add editorial app shell primitives"
```

### Task 2: Recipe image contract and resilient visual component

**Files:**
- Modify: `src/domain/recipes/recipe.ts`
- Create: `src/client/components/RecipeVisual.tsx`
- Modify: `tests/domain/recipe-schema.test.ts`
- Create: `tests/client/recipe-visual.test.tsx`

**Interfaces:**
- Consumes: `RecipeCategory` and the existing recipe schema.
- Produces: optional `Recipe.imagePath?: string` restricted to `/recipes/<slug>.webp` or `/recipes/<slug>.avif`; `RecipeVisual({ recipe, variant }): JSX.Element` where `variant` is `"card" | "detail"`.

- [ ] **Step 1: Write failing schema tests for image paths**

Add `accepts_a_local_optimized_recipe_image_path` and `rejects_remote_or_unversioned_recipe_image_paths`. Assert local WebP and AVIF paths parse, while `https://...`, `../...`, PNG and paths with whitespace fail.

- [ ] **Step 2: Run the schema test and verify failure**

Run: `pnpm vitest run tests/domain/recipe-schema.test.ts`

Expected: FAIL because `imagePath` is not validated.

- [ ] **Step 3: Extend the recipe schema**

Add `imagePath` as an optional local path matching `^/recipes/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:avif|webp)$`. Do not require changes to the 45 existing records.

- [ ] **Step 4: Run the schema test and verify success**

Run: `pnpm vitest run tests/domain/recipe-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing `RecipeVisual` tests**

Add `renders_a_stable_category_placeholder_without_an_image` and `renders_an_optimized_decorative_image_when_available`. Assert the fallback has `data-category="snack"`, the image uses `alt=""` and `decoding="async"`, card images use `loading="lazy"`, and detail images use `loading="eager"` plus `fetchPriority="high"`.

- [ ] **Step 6: Run the visual component test and verify failure**

Run: `pnpm vitest run tests/client/recipe-visual.test.tsx`

Expected: FAIL because `RecipeVisual` does not exist.

- [ ] **Step 7: Implement `RecipeVisual`**

Use a fixed-ratio wrapper for both variants. Render the `<img>` only when `imagePath` exists; otherwise render the existing plate-and-leaf motif with the recipe category exposed only as a data attribute for styling.

- [ ] **Step 8: Run the focused tests and verify success**

Run: `pnpm vitest run tests/domain/recipe-schema.test.ts tests/client/recipe-visual.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit the media contract**

```bash
git add src/domain/recipes/recipe.ts src/client/components/RecipeVisual.tsx tests/domain/recipe-schema.test.ts tests/client/recipe-visual.test.tsx
git commit -m "feat: add resilient recipe image contract"
```

### Task 3: Accessible category chips with Snack

**Files:**
- Modify: `src/client/features/recipes/RecipeFilters.tsx`
- Modify: `tests/client/recipe-catalog.test.tsx`

**Interfaces:**
- Consumes: `RecipeCategory | ""`, `onSearchChange`, and `onCategoryChange` from the existing catalog.
- Produces: a labelled category group with six buttons whose `aria-pressed` value reflects the selected query parameter.

- [ ] **Step 1: Replace the select-based test with failing chip behavior**

Update the catalog test to click the `Almuerzos` button instead of selecting an option. Add `offers_snack_as_a_first_class_category` and assert the six buttons appear in the approved order, each target is a button, and clicking `Snacks` filters to a snack fixture.

- [ ] **Step 2: Run the catalog test and verify failure**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx`

Expected: FAIL because category controls are still a select.

- [ ] **Step 3: Implement semantic filter chips**

Keep the labelled search input. Replace the category select with a group labelled `Categorías de recetas`; render `Todas` plus the five category values, use `type="button"`, and call `onCategoryChange` with the exact existing enum value.

- [ ] **Step 4: Run the catalog test and verify success**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the filters**

```bash
git add src/client/features/recipes/RecipeFilters.tsx tests/client/recipe-catalog.test.tsx
git commit -m "feat: expose snack in category chips"
```

### Task 4: Editorial recipe cards and detail composition

**Files:**
- Modify: `src/client/components/RecipeCard.tsx`
- Modify: `src/client/features/recipes/RecipeDetailPage.tsx`
- Modify: `src/client/features/recipes/recipeViewModel.ts`
- Modify: `tests/client/recipe-catalog.test.tsx`
- Modify: `tests/client/recipe-detail.test.tsx`

**Interfaces:**
- Consumes: `RecipeVisual`, existing serving scaling, and `RecipeCategory`.
- Produces: `formatRecipeCategory(category: RecipeCategory): string`; consistent category labels and media in card/detail views.

- [ ] **Step 1: Write failing composition tests**

Add `labels_snack_consistently_in_card_and_detail`, `keeps_long_titles_and_metadata_in_the_accessible_name_flow`, and `uses_the_shared_recipe_visual`. Assert singular `Snack`, total minutes, portions, and the shared visual test id appear without duplicating the recipe title as image alt text.

- [ ] **Step 2: Run recipe client tests and verify failure**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx tests/client/recipe-detail.test.tsx`

Expected: FAIL because category formatting is private to the card and the shared visual is unused.

- [ ] **Step 3: Add the category formatter**

Implement `formatRecipeCategory(category: RecipeCategory): string` in `recipeViewModel.ts` with the exact singular labels Desayuno, Almuerzo, Cena, Snack and Postre.

- [ ] **Step 4: Recompose cards and details**

Replace direct motif markup with `RecipeVisual`. Keep the card link stretched across the card, preserve the current summary and metadata, and show the formatted category in both surfaces. Do not change serving calculations or draft visibility.

- [ ] **Step 5: Run recipe client tests and verify success**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx tests/client/recipe-detail.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit recipe composition**

```bash
git add src/client/components/RecipeCard.tsx src/client/features/recipes/RecipeDetailPage.tsx src/client/features/recipes/recipeViewModel.ts tests/client/recipe-catalog.test.tsx tests/client/recipe-detail.test.tsx
git commit -m "feat: apply editorial recipe presentation"
```

### Task 5: Responsive design system and page layout

**Files:**
- Modify: `src/client/styles/tokens.css`
- Modify: `src/client/styles/global.css`
- Create: `src/client/styles/shell.css`
- Create: `src/client/styles/recipes.css`
- Modify: `src/client/main.tsx`
- Modify: `e2e/recipe-responsive.spec.ts`

**Interfaces:**
- Consumes: class names produced by Tasks 1 through 4.
- Produces: tokenized responsive layout with mobile bottom navigation, desktop sidebar, horizontally scrollable filter chips and stable recipe media ratios.

- [ ] **Step 1: Expand the failing responsive journey**

At 375 by 667 assert all six category buttons are reachable by horizontal scrolling, all nav links and filter buttons are at least 44 pixels tall, the last card can scroll above the fixed navigation, and no page-level horizontal overflow exists. Use keyboard Tab to focus the first navigation link and assert its computed outline style is not `none`. With reduced motion enabled, assert the recipe card and nav link computed transition durations are `0s`. At 1280 by 800 assert the navigation bounds are left of the main content bounds. At 667 by 375 with a 125 percent root font assert search, chips and all navigation destinations remain reachable.

- [ ] **Step 2: Run the responsive journey and verify failure**

Run: `pnpm playwright test e2e/recipe-responsive.spec.ts`

Expected: FAIL on the new chip, desktop placement or safe-area assertions.

- [ ] **Step 3: Define semantic design tokens**

Extend `tokens.css` with font roles, surface roles, teal/terracotta interaction states, icon sizes, safe-area spacing and elevation tokens. Preserve sufficient text and focus contrast.

- [ ] **Step 4: Split focused styles**

Keep resets, base typography, focus and common utilities in `global.css`. Move shell/brand/navigation rules to `shell.css`; move catalog/filter/card/detail rules to `recipes.css`. Import both after `global.css` in `main.tsx`.

- [ ] **Step 5: Implement the approved responsive behavior**

Use bottom navigation below 64rem and a sticky left sidebar from 64rem. Set main content bottom padding to navigation height plus `env(safe-area-inset-bottom)`. Make chips one-line horizontally scrollable without causing document overflow. Apply media aspect ratios and object-fit. Only define transitions inside `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 6: Run the responsive journey and verify success**

Run: `pnpm playwright test e2e/recipe-responsive.spec.ts`

Expected: PASS at all tested layouts.

- [ ] **Step 7: Run accessibility-focused component tests**

Run: `pnpm vitest run tests/client/app-shell.test.tsx tests/client/recipe-catalog.test.tsx tests/client/recipe-detail.test.tsx tests/client/recipe-visual.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the design system**

```bash
git add src/client/styles/tokens.css src/client/styles/global.css src/client/styles/shell.css src/client/styles/recipes.css src/client/main.tsx e2e/recipe-responsive.spec.ts
git commit -m "feat: implement responsive editorial design system"
```

### Task 6: PWA chrome and full increment verification

**Files:**
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `e2e/recipe-journey.spec.ts`
- Modify: `docs/superpowers/plans/2026-10-15-visual-system-navigation-implementation.md`

**Interfaces:**
- Consumes: approved visual tokens and existing PWA icons.
- Produces: matching browser/PWA colors and a recorded completed checklist for this increment.

- [ ] **Step 1: Add failing PWA chrome assertions**

Assert `meta[name="theme-color"]` and the manifest use the approved deep teal `#003C37`, the background uses cream `#FFFAF7`, and direct recipe routing still succeeds.

- [ ] **Step 2: Run the journey and verify failure**

Run: `pnpm playwright test e2e/recipe-journey.spec.ts`

Expected: FAIL because current chrome colors use the previous palette.

- [ ] **Step 3: Align document and manifest chrome**

Update `index.html` and `manifest.webmanifest` to the exact approved colors without changing the app name, scope, start URL or icon paths.

- [ ] **Step 4: Run the complete verification suite**

Run: `pnpm test`

Expected: all Vitest tests PASS.

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: production build succeeds and `verify-production-bundle.mjs` confirms no unapproved recipe content.

Run: `pnpm playwright test`

Expected: all Playwright journeys PASS.

- [ ] **Step 5: Mark completed plan steps only after evidence exists**

Replace `[ ]` with `[x]` for each completed item in this plan; do not mark a verification step whose command did not pass.

- [ ] **Step 6: Commit verification and PWA polish**

```bash
git add index.html public/manifest.webmanifest e2e/recipe-journey.spec.ts docs/superpowers/plans/2026-10-15-visual-system-navigation-implementation.md
git commit -m "test: verify visual system increment"
```

## Handoff to the next increment

After this plan passes, create the separate planner-and-shopping implementation plan against the resulting component and routing interfaces. Do not begin Supabase or Hotmart work until the planner domain and persistence boundary have their own approved plan.
