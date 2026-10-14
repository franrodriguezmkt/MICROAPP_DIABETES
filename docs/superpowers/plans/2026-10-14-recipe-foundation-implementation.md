# Recipe Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first deployable vertical slice: a mobile-first Cloudflare-hosted recipe application with validated draft content, a searchable catalog, recipe detail pages and a production guard against unreviewed medical material.

**Architecture:** A React SPA and a Hono API Worker deploy together through Cloudflare Workers Static Assets and the Cloudflare Vite plugin. Recipe data is validated at build time with Zod and consumed through a repository interface so Supabase can replace the local implementation in Increment 3 without changing screens or domain logic.

**Tech Stack:** TypeScript strict mode, React, React Router, Vite, Cloudflare Vite plugin, Cloudflare Workers, Hono, Zod, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-14-microapp-recetas-diabetes-design.md`

## Global Constraints

- The product is a mobile-first installable web application in Spanish.
- The product organizes recipes and meals; it does not track glucose, medication or diagnoses.
- Only recipes with `publicationStatus: "approved"` may appear when `contentPreview` is false.
- The 45 imported recipes begin with `publicationStatus: "draft"` until professional review is recorded.
- No nutritional or medical claim may be invented during normalization.
- Cloudflare Workers serves both static assets and `/api/*`; use compatibility date `2026-10-14`.
- All runtime code is TypeScript with `strict: true` and no unchecked `any`.
- No secret, Supabase service key or Hotmart Hottok may be present in browser bundles.
- Spanish copy must preserve accents and use plain language.
- Every functional change follows a failing test, minimal implementation, passing test and focused commit.

## Review Focus

- A malformed quantity, unsupported unit or duplicate slug must fail content validation and stop the build; Task 3 owns these tests.
- Search must ignore case and accents while preserving original display text; Task 5 owns this test.
- A production catalog with only draft content must show the review-safe empty state, never draft recipes; Task 5 owns this test.
- Serving changes such as 2 to 3 portions must scale decimal ingredient quantities consistently without changing source data; Task 6 owns this test.
- Direct navigation to `/recetas/:slug` must return the SPA while `/api/*` continues to reach the Worker; Task 7 owns this test.

---

## File Structure

```text
.
|-- content/
|   `-- recipes/
|       |-- recipes.json                 # 45 normalized draft recipes
|       `-- sources.json                 # source PDF inventory and provenance
|-- e2e/
|   `-- recipe-journey.spec.ts           # browser acceptance path
|-- public/
|   |-- icons/
|   |   |-- icon-192.png
|   |   `-- icon-512.png
|   |-- manifest.webmanifest
|   `-- robots.txt
|-- src/
|   |-- client/
|   |   |-- app/
|   |   |   |-- App.tsx
|   |   |   `-- router.tsx
|   |   |-- components/
|   |   |   |-- AppShell.tsx
|   |   |   |-- EmptyState.tsx
|   |   |   `-- RecipeCard.tsx
|   |   |-- features/recipes/
|   |   |   |-- RecipeCatalogPage.tsx
|   |   |   |-- RecipeDetailPage.tsx
|   |   |   |-- RecipeFilters.tsx
|   |   |   `-- recipeViewModel.ts
|   |   |-- lib/
|   |   |   `-- content.ts
|   |   |-- styles/
|   |   |   |-- global.css
|   |   |   `-- tokens.css
|   |   `-- main.tsx
|   |-- domain/recipes/
|   |   |-- recipe.ts
|   |   |-- recipeRepository.ts
|   |   |-- recipeSearch.ts
|   |   `-- servingScale.ts
|   |-- infrastructure/recipes/
|   |   `-- jsonRecipeRepository.ts
|   `-- worker/
|       |-- app.ts
|       `-- index.ts
|-- tests/
|   |-- client/
|   |   |-- recipe-catalog.test.tsx
|   |   `-- recipe-detail.test.tsx
|   |-- content/
|   |   `-- recipes.test.ts
|   |-- domain/
|   |   |-- recipe-schema.test.ts
|   |   |-- recipe-search.test.ts
|   |   `-- serving-scale.test.ts
|   `-- worker/
|       `-- health.test.ts
|-- index.html
|-- package.json
|-- playwright.config.ts
|-- pnpm-lock.yaml
|-- tsconfig.json
|-- vite.config.ts
|-- vitest.config.ts
|-- worker-configuration.d.ts
`-- wrangler.jsonc
```

The source PDFs remain reference inputs and are not shipped in the browser bundle. The JSON content records their filename and page provenance.

### Task 1: Cloudflare React Project and Test Harness

**Files:**

- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `wrangler.jsonc`
- Create: `worker-configuration.d.ts` through `wrangler types`
- Create: `index.html`
- Create: `src/client/main.tsx`
- Create: `src/client/app/App.tsx`
- Create: `src/worker/app.ts`
- Create: `src/worker/index.ts`
- Create: `tests/worker/health.test.ts`

**Interfaces:**

- Consumes: none; this is the project foundation.
- Produces: `createWorkerApp(): Hono<WorkerBindings>` from `src/worker/app.ts`; browser entry at `src/client/main.tsx`; scripts `dev`, `test`, `typecheck`, `build`, `preview`, `deploy` and `test:e2e`.

- [ ] **Step 1: Write the failing Worker health test**

```ts
it("returns the build-independent health contract", async () => {
  const response = await createWorkerApp().request("http://local.test/api/health");
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, service: "recipe-app" });
});
```

- [ ] **Step 2: Run the isolated test and verify the foundation is missing**

Run: `pnpm vitest run tests/worker/health.test.ts`

Expected: FAIL because `src/worker/app.ts` does not exist.

- [ ] **Step 3: Create package scripts and platform configuration**

Install the stack named in the header and define the required scripts. Configure TypeScript strict mode, Vitest with `jsdom`, Playwright, the Cloudflare Vite plugin and `wrangler.jsonc` with `main: "src/worker/index.ts"`, `compatibility_date: "2026-10-14"`, SPA fallback and Worker-first routing only for `/api/*`. Generate `worker-configuration.d.ts` with `wrangler types` rather than maintaining a handwritten environment type.

- [ ] **Step 4: Create the minimal React browser entry**

Render `App` into `#root` and show a Spanish application placeholder that contains no product claim beyond the approved scope.

- [ ] **Step 5: Add the health endpoint and Worker export**

Implement `createWorkerApp(): Hono<WorkerBindings>` and export a Worker `fetch` handler from `src/worker/index.ts`.

- [ ] **Step 6: Verify tests, types and production build**

Run: `pnpm test && pnpm typecheck && pnpm build`

Expected: all commands exit 0; build output includes the SPA assets and Worker entry.

- [ ] **Step 7: Commit the platform foundation**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts wrangler.jsonc worker-configuration.d.ts index.html src/client src/worker tests/worker
git commit -m "chore: scaffold Cloudflare recipe app"
```

### Task 2: Recipe Domain Contracts

**Files:**

- Create: `src/domain/recipes/recipe.ts`
- Create: `src/domain/recipes/recipeRepository.ts`
- Create: `tests/domain/recipe-schema.test.ts`

**Interfaces:**

- Consumes: Zod dependency established in Task 1.
- Produces: `Recipe`, `RecipeIngredient`, `RecipeCategory`, `PublicationStatus`, `IngredientUnit`; `recipeSchema`; `recipeCollectionSchema`; `RecipeRepository.list(query)` and `RecipeRepository.getBySlug(slug, options)`.

- [ ] **Step 1: Write failing schema contract tests**

Test names and assertions:

```ts
it("accepts a complete recipe with source provenance", () => {
  expect(recipeSchema.parse(validRecipe)).toMatchObject({ slug: "avena-canela-manzana", publicationStatus: "draft" });
});

it.each(["", "../escape", "Con Espacios"])("rejects invalid slug %s", (slug) => {
  expect(() => recipeSchema.parse({ ...validRecipe, slug })).toThrow();
});

it("rejects an ingredient with a non-positive quantity", () => {
  expect(() => recipeSchema.parse(recipeWithQuantity(0))).toThrow();
});
```

- [ ] **Step 2: Run the domain test and confirm failure**

Run: `pnpm vitest run tests/domain/recipe-schema.test.ts`

Expected: FAIL because the recipe schema is not defined.

- [ ] **Step 3: Implement the domain types and Zod schemas**

Use these exact unions:

```ts
type RecipeCategory = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
type PublicationStatus = "draft" | "editorial_review" | "professional_review" | "approved";
type IngredientUnit = "g" | "kg" | "ml" | "l" | "unit" | "tbsp" | "tsp" | "cup" | "pinch" | "to_taste";
```

Every recipe includes `id`, `slug`, `title`, `summary`, `category`, `servingsBase`, `prepMinutes`, `cookMinutes`, `ingredients`, `instructions`, `tags`, `allergens`, `publicationStatus`, and `source: { fileName, pageStart, pageEnd }`. `RecipeIngredient.quantity` is `number | null`: positive numbers are required for every unit except `to_taste`, which requires `null`.

- [ ] **Step 4: Define the repository interface**

```ts
type RecipeQuery = {
  category?: RecipeCategory;
  search?: string;
  excludedIngredientIds?: string[];
  includeDrafts?: boolean;
};

interface RecipeRepository {
  list(query?: RecipeQuery): Promise<Recipe[]>;
  getBySlug(slug: string, options?: { includeDrafts?: boolean }): Promise<Recipe | null>;
}
```

- [ ] **Step 5: Verify the domain test and type checker**

Run: `pnpm vitest run tests/domain/recipe-schema.test.ts && pnpm typecheck`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit the stable domain contract**

```bash
git add src/domain/recipes tests/domain/recipe-schema.test.ts
git commit -m "feat: define recipe domain contracts"
```

### Task 3: Source Inventory and Draft Recipe Dataset

**Files:**

- Create: `content/recipes/sources.json`
- Create: `content/recipes/recipes.json`
- Create: `tests/content/recipes.test.ts`

**Interfaces:**

- Consumes: `recipeCollectionSchema` from Task 2 and the nine source PDFs listed in the approved spec.
- Produces: a UTF-8 JSON dataset of exactly 45 draft recipes and a nine-entry source manifest. Later tasks import this data through the repository only.

- [ ] **Step 1: Write the failing dataset integrity test**

```ts
it("contains the complete recipe inventory", () => {
  const recipes = recipeCollectionSchema.parse(rawRecipes);
  expect(recipes).toHaveLength(45);
  expect(countBy(recipes, "category")).toEqual({
    breakfast: 10,
    lunch: 10,
    dinner: 10,
    snack: 5,
    dessert: 10,
  });
});

it("keeps all imported content out of production until reviewed", () => {
  expect(rawRecipes.every((recipe) => recipe.publicationStatus === "draft")).toBe(true);
});

it("has unique ids, slugs and valid source page ranges", () => {
  expect(uniqueValues(rawRecipes, "id")).toHaveLength(45);
  expect(uniqueValues(rawRecipes, "slug")).toHaveLength(45);
  expect(rawRecipes.every(({ source }) => source.pageStart >= 1 && source.pageEnd >= source.pageStart)).toBe(true);
});
```

- [ ] **Step 2: Run the content test and confirm files are missing**

Run: `pnpm vitest run tests/content/recipes.test.ts`

Expected: FAIL because the content JSON files do not exist.

- [ ] **Step 3: Create the nine-document source manifest**

Record the exact source filename, page count and content role from Section 4 of the approved spec. Do not copy the source PDFs into the client build.

- [ ] **Step 4: Normalize the 45 recipes as draft records**

Transcribe ingredients and instructions without creating missing nutritional values or strengthening medical claims. Normalize units only when the source quantity is unambiguous; otherwise use `unit: "to_taste"` with a preparation note or flag the record in `tags` as `needs_editorial_review`.

- [ ] **Step 5: Run dataset tests and inspect the diff for invented claims**

Run: `pnpm vitest run tests/content/recipes.test.ts && git diff --check`

Expected: PASS; 45 valid records; no recipe is `approved`.

- [ ] **Step 6: Commit the draft content inventory**

```bash
git add content/recipes tests/content/recipes.test.ts
git commit -m "content: normalize initial recipe library"
```

### Task 4: JSON Repository and Search Rules

**Files:**

- Create: `src/domain/recipes/recipeSearch.ts`
- Create: `src/infrastructure/recipes/jsonRecipeRepository.ts`
- Create: `src/client/lib/content.ts`
- Create: `tests/domain/recipe-search.test.ts`

**Interfaces:**

- Consumes: `Recipe`, `RecipeQuery` and `RecipeRepository` from Task 2; dataset from Task 3.
- Produces: `normalizeSearchText(value: string): string`; `matchesRecipe(recipe, query): boolean`; `createJsonRecipeRepository(recipes, config): RecipeRepository`; `createClientRecipeRepository(env): RecipeRepository`; `recipeRepository` client instance.

- [ ] **Step 1: Write failing search and publication tests**

```ts
it("matches search without case or accents", () => {
  expect(matchesRecipe(recipeNamed("Pudín de Chía"), { search: "pudin chia" })).toBe(true);
});

it("excludes a recipe containing an excluded ingredient", () => {
  expect(matchesRecipe(recipeWithIngredient("peanut"), { excludedIngredientIds: ["peanut"] })).toBe(false);
});

it("hides draft recipes when content preview is disabled", async () => {
  const repository = createJsonRecipeRepository([draftRecipe, approvedRecipe], { contentPreview: false });
  await expect(repository.list()).resolves.toEqual([approvedRecipe]);
});
```

- [ ] **Step 2: Run the search test and verify failure**

Run: `pnpm vitest run tests/domain/recipe-search.test.ts`

Expected: FAIL because search and repository functions are missing.

- [ ] **Step 3: Implement normalization and matching rules**

`normalizeSearchText` must Unicode-normalize to NFD, remove combining marks, trim, collapse whitespace and lowercase using `es` locale. Search title, summary, ingredient display names and tags.

- [ ] **Step 4: Implement the JSON repository guard**

The repository validates input through `recipeCollectionSchema`. `includeDrafts` works only when repository config has `contentPreview: true`; a query cannot override a production repository.

`createClientRecipeRepository` enables preview only when `import.meta.env.MODE !== "production"` and `VITE_CONTENT_PREVIEW === "true"`. Production mode always forces `contentPreview: false`, even if the variable is present.

- [ ] **Step 5: Verify search, repository and types**

Run: `pnpm vitest run tests/domain/recipe-search.test.ts && pnpm typecheck`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit the repository boundary**

```bash
git add src/domain/recipes/recipeSearch.ts src/infrastructure/recipes src/client/lib/content.ts tests/domain/recipe-search.test.ts
git commit -m "feat: add guarded recipe repository"
```

### Task 5: Mobile App Shell and Recipe Catalog

**Files:**

- Create: `src/client/app/router.tsx`
- Create: `src/client/components/AppShell.tsx`
- Create: `src/client/components/EmptyState.tsx`
- Create: `src/client/components/RecipeCard.tsx`
- Create: `src/client/features/recipes/RecipeCatalogPage.tsx`
- Create: `src/client/features/recipes/RecipeFilters.tsx`
- Create: `src/client/styles/tokens.css`
- Create: `src/client/styles/global.css`
- Modify: `src/client/app/App.tsx`
- Modify: `src/client/main.tsx`
- Create: `tests/client/recipe-catalog.test.tsx`

**Interfaces:**

- Consumes: `recipeRepository.list(query)` from Task 4.
- Produces: route `/recetas`; reusable `RecipeCard`; URL query parameters `q` and `category`; navigation shell for future `/semana`, `/compras`, `/recetas`, `/recursos` and `/cuenta` routes.

- [ ] **Step 1: Write failing catalog interaction tests**

```tsx
it("filters recipe cards by category and accent-insensitive search", async () => {
  renderCatalogWith([pudinRecipe, polloRecipe]);
  await user.type(screen.getByRole("searchbox", { name: /buscar recetas/i }), "pudin");
  expect(screen.getByRole("link", { name: /pudín de chía/i })).toBeVisible();
  expect(screen.queryByRole("link", { name: /pollo/i })).not.toBeInTheDocument();
});

it("shows a safe review state when production has no approved recipes", async () => {
  renderCatalogWith([]);
  expect(await screen.findByText(/estamos revisando las recetas/i)).toBeVisible();
  expect(screen.queryByText(/no hay contenido/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the catalog test and verify failure**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx`

Expected: FAIL because the catalog components do not exist.

- [ ] **Step 3: Implement design tokens and the mobile shell**

Use the approved document palette as the initial system: deep green `#0B5549`, teal `#137A68`, mint `#E8F4F0`, coral `#EE7D62`, cream `#FAF8F2`, ink `#18342F`. Meet WCAG AA contrast, 44px minimum interactive targets and visible keyboard focus.

- [ ] **Step 4: Implement catalog route, URL state and cards**

The catalog reads `q` and `category` from the URL, calls the repository and renders loading, populated and review-safe empty states. Card images use a category-colored placeholder until approved image assets exist.

- [ ] **Step 5: Verify component, accessibility and type checks**

Run: `pnpm vitest run tests/client/recipe-catalog.test.tsx && pnpm typecheck`

Expected: PASS; no `act` warnings; all controls have accessible names.

- [ ] **Step 6: Commit the catalog experience**

```bash
git add src/client tests/client/recipe-catalog.test.tsx
git commit -m "feat: add mobile recipe catalog"
```

### Task 6: Recipe Detail and Serving Scaling

**Files:**

- Create: `src/domain/recipes/servingScale.ts`
- Create: `src/client/features/recipes/recipeViewModel.ts`
- Create: `src/client/features/recipes/RecipeDetailPage.tsx`
- Modify: `src/client/app/router.tsx`
- Create: `tests/domain/serving-scale.test.ts`
- Create: `tests/client/recipe-detail.test.tsx`

**Interfaces:**

- Consumes: `RecipeRepository.getBySlug` and `RecipeIngredient`.
- Produces: `scaleIngredient(ingredient, fromServings, toServings): ScaledIngredient`; route `/recetas/:slug`; `formatIngredientQuantity(quantity, unit): string`.

- [ ] **Step 1: Write failing scaling tests**

```ts
it("scales from two to three servings without mutating the source", () => {
  const source = ingredient({ quantity: 100, unit: "g" });
  expect(scaleIngredient(source, 2, 3).quantity).toBe(150);
  expect(source.quantity).toBe(100);
});

it("keeps to-taste ingredients unnumbered", () => {
  expect(scaleIngredient(ingredient({ quantity: null, unit: "to_taste" }), 2, 4).quantity).toBeNull();
});

it("formats recurring decimal quantities consistently", () => {
  expect(formatIngredientQuantity(0.333333, "cup")).toBe("0,33 taza");
});
```

- [ ] **Step 2: Write the failing detail-page interaction test**

The test opens `/recetas/avena-canela-manzana`, changes servings from 2 to 3 and asserts the visible 100 g ingredient becomes 150 g while steps and source record remain unchanged.

- [ ] **Step 3: Run the domain and component tests to verify failure**

Run: `pnpm vitest run tests/domain/serving-scale.test.ts tests/client/recipe-detail.test.tsx`

Expected: FAIL because scaling and detail page are missing.

- [ ] **Step 4: Implement pure serving calculations and formatting**

Reject serving counts outside integer range 1 through 12. Round internal scaled quantities to four decimal places and visible metric quantities to at most two decimal places with Spanish comma formatting.

- [ ] **Step 5: Implement the recipe detail route**

Render title, source-safe summary, time, servings control, ingredients, ordered instructions, allergens and a general educational notice. Unknown or hidden slugs render a not-found state without exposing draft status.

- [ ] **Step 6: Verify scaling, detail UI and types**

Run: `pnpm vitest run tests/domain/serving-scale.test.ts tests/client/recipe-detail.test.tsx && pnpm typecheck`

Expected: PASS and exit 0.

- [ ] **Step 7: Commit the detail experience**

```bash
git add src/domain/recipes/servingScale.ts src/client/features/recipes src/client/app/router.tsx tests/domain/serving-scale.test.ts tests/client/recipe-detail.test.tsx
git commit -m "feat: add recipe detail and serving controls"
```

### Task 7: PWA, Static-Asset Routing and Browser Acceptance

**Files:**

- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/robots.txt`
- Modify: `index.html`
- Modify: `wrangler.jsonc`
- Create: `e2e/recipe-journey.spec.ts`

**Interfaces:**

- Consumes: `/recetas` and `/recetas/:slug` from Tasks 5 and 6; `/api/health` from Task 1.
- Produces: installable manifest metadata; SPA direct-navigation behavior; end-to-end recipe browsing acceptance test.

- [ ] **Step 1: Write the failing browser journey**

```ts
test("finds and opens a recipe from a direct mobile route", async ({ page }) => {
  await page.goto("/recetas?q=pudin");
  await page.getByRole("link", { name: /pudín de chía/i }).click();
  await expect(page).toHaveURL(/\/recetas\/pudin-de-chia-con-leche-vegetal-y-vainilla$/);
  await expect(page.getByRole("heading", { name: /pudín de chía/i })).toBeVisible();
});
```

Run Playwright against the development server with `VITE_CONTENT_PREVIEW=true`; Task 4 guarantees this flag is ignored in production mode. Do not approve production content to make the test pass.

- [ ] **Step 2: Run the journey and verify failure**

Run: `pnpm test:e2e -- --project=chromium`

Expected: FAIL because PWA assets and E2E fixture wiring are absent.

- [ ] **Step 3: Add installable metadata and non-medical icons**

Set `name` to `Mi semana de recetas`, `short_name` to `Mis recetas`, `display` to `standalone`, `start_url` to `/recetas`, theme color `#0B5549` and background color `#FAF8F2`. Icons use an abstract plate/leaf motif and contain no medical cross or glucose claim.

- [ ] **Step 4: Configure Cloudflare SPA and API routing**

Use `assets.not_found_handling: "single-page-application"` and `assets.run_worker_first: ["/api/*"]`. Verify direct navigation serves `index.html` and an API fetch invokes the Worker.

- [ ] **Step 5: Run the complete verification suite**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm test:e2e -- --project=chromium`

Expected: all commands exit 0; `/api/health` returns JSON; `/recetas/:slug` loads after direct navigation.

- [ ] **Step 6: Inspect the production bundle**

Run: `rg -n "SUPABASE_SERVICE_ROLE|HOTMART_HOTTOK|service_role" dist .wrangler --glob '!**/*.map'`

Expected: no matches.

- [ ] **Step 7: Commit the deployable first increment**

```bash
git add public index.html wrangler.jsonc e2e
git commit -m "feat: make recipe experience installable"
```

## Completion Gate

Before declaring Increment 1 complete:

- Run `pnpm test` and require all unit/component/Worker tests to pass.
- Run `pnpm typecheck` and require zero TypeScript errors.
- Run `pnpm build` and require a deployable Cloudflare output.
- Run the Chromium Playwright journey at a mobile viewport.
- Inspect catalog and detail pages at 360px, 768px and 1280px widths.
- Confirm exactly 45 draft recipe records and zero approved production recipes.
- Confirm the browser bundle contains no server secrets.
- Review every normalized recipe diff for invented medical or nutritional claims.
- Request a whole-increment code review before moving to Increment 2.
