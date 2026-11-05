# Mis Semanas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Añadir una biblioteca privada donde cada usuario guarda, abre, renombra y elimina semanas completas, y puede crear la siguiente semana sin modificar las anteriores.

**Architecture:** Se extiende `weekly_plans` con metadatos de guardado y RPC autenticadas, conservando las tablas relacionales existentes para comidas y compras. Worker y cliente exponen un contrato `SavedWeekSummary`; React añade una ruta `mis-semanas` y navegación secundaria dentro de Semana sin ampliar la barra principal más allá de cinco destinos.

**Tech Stack:** React, TypeScript, Hono Worker, Supabase PostgreSQL/RPC/RLS, Vitest, Testing Library, Playwright, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-11-05-saved-weeks-design.md`

## Global Constraints

- Migración aditiva: sin reset, sin eliminar semanas actuales y sin servicios pagos nuevos.
- Una semana visitada sigue siendo borrador hasta un guardado manual.
- Guardar/restaurar conserva recetas, porciones, reemplazos y lista de compras exacta.
- `title` tiene 1–60 caracteres sin espacios externos.
- Cada usuario solo puede administrar sus propias semanas mediante `auth.uid()`.
- La navegación principal conserva cinco destinos; `Mis Semanas` es secundaria dentro de `Semana`.
- Controles móviles de al menos 44×44 px, sin desplazamiento horizontal a 375 px.

## Review Focus

- Re-guardar el snapshot de una semana guardada no debe borrar `title` ni `saved_at`; Task 1 lo cubre con prueba de repositorio/RPC.
- Un usuario no puede listar, renombrar o borrar semanas de otro; Task 2 lo cubre en rutas autenticadas.
- Crear otra semana debe saltar fechas ya guardadas y no alterar semanas previas; Task 3 lo cubre con prueba de cliente.
- Eliminar requiere confirmación y debe borrar también las compras asociadas; Tasks 1 y 3 cubren persistencia y UI.
- Una receta ya no publicada no debe romper la lista; Task 3 cubre el marcador visual seguro.

---

### Task 1: Dominio y persistencia de semanas guardadas

**Files:**
- Modify: `src/domain/planner/planner.ts`
- Modify: `src/application/planner/PlannerRepository.ts`
- Modify: `src/infrastructure/planner/InMemoryPlannerRepository.ts`
- Modify: `src/infrastructure/planner/SupabasePlannerRepository.ts`
- Modify: `src/infrastructure/supabase/database.types.ts`
- Create: `supabase/migrations/202611050002_saved_weeks.sql`
- Test: `tests/domain/saved-weeks.test.ts`
- Test: `tests/infrastructure/supabase-planner-repository.test.ts`

**Interfaces:**
- Produces: `SavedWeekSummary`, `savedWeekSummarySchema`, `PlannerRepository.listSavedWeeks`, `saveWeekToLibrary`, `renameSavedWeek`, `deleteSavedWeek`.
- Preserves: `PlannerRepository.saveWeek` mantiene metadatos de biblioteca en un snapshot existente.

- [x] **Step 1: Escribir pruebas fallidas de esquema y repositorio**

Probar validación de título, orden por `savedAt`, borradores excluidos, persistencia de renombrado/eliminación y conservación de metadatos al guardar un snapshot.

- [x] **Step 2: Ejecutar pruebas y confirmar RED**

Run: `pnpm test tests/domain/saved-weeks.test.ts tests/infrastructure/supabase-planner-repository.test.ts`

Expected: FAIL porque el contrato de semanas guardadas aún no existe.

- [x] **Step 3: Implementar dominio, repositorios y migración**

Firmas:

```ts
type SavedWeekSummary = {
  weekStart: string;
  title: string;
  savedAt: string;
  people: number;
  mealCount: number;
  previewRecipeId: string | null;
};

listSavedWeeks(userId: string): Promise<SavedWeekSummary[]>;
saveWeekToLibrary(userId: string, weekStart: string, title: string): Promise<SavedWeekSummary>;
renameSavedWeek(userId: string, weekStart: string, title: string): Promise<SavedWeekSummary>;
deleteSavedWeek(userId: string, weekStart: string): Promise<boolean>;
```

La migración añade `title`, `saved_at`, restricciones, índice parcial y RPC. Redefine `save_planner_week_snapshot` para preservar los metadatos.

- [x] **Step 4: Ejecutar pruebas enfocadas y confirmar GREEN**

Run: `pnpm test tests/domain/saved-weeks.test.ts tests/infrastructure/supabase-planner-repository.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src tests supabase
git commit -m "feat: persist saved weeks"
```

### Task 2: Servicio, API Worker y cliente

**Files:**
- Modify: `src/application/planner/PlannerService.ts`
- Modify: `src/worker/plannerRoutes.ts`
- Modify: `src/client/lib/plannerClient.ts`
- Test: `tests/application/planner-service.test.ts`
- Test: `tests/worker/planner-routes.test.ts`
- Create: `tests/client/planner-client.test.ts`

**Interfaces:**
- Consumes: contratos de Task 1.
- Produces: `GET /api/saved-weeks`, `POST /api/weeks/:weekStart/save`, `PATCH /api/saved-weeks/:weekStart`, `DELETE /api/saved-weeks/:weekStart` y métodos equivalentes en `PlannerClient`.

- [x] **Step 1: Escribir pruebas fallidas de servicio, rutas y cliente**

Probar éxito, título inválido, semana inexistente, aislamiento por usuario y `404` sin revelar datos ajenos.

- [x] **Step 2: Ejecutar pruebas y confirmar RED**

Run: `pnpm test tests/application/planner-service.test.ts tests/worker/planner-routes.test.ts tests/client/planner-client.test.ts`

Expected: FAIL por métodos y rutas ausentes.

- [x] **Step 3: Implementar servicio, esquemas de entrada, rutas y cliente**

Los endpoints devuelven `SavedWeekSummary`; `DELETE` devuelve `204` y `404` cuando no existe o no pertenece al usuario.

- [x] **Step 4: Ejecutar pruebas enfocadas y confirmar GREEN**

Run: `pnpm test tests/application/planner-service.test.ts tests/worker/planner-routes.test.ts tests/client/planner-client.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: expose saved weeks API"
```

### Task 3: Experiencia Crear semana y Mis Semanas

**Files:**
- Create: `src/client/features/planner/WeekSectionNav.tsx`
- Create: `src/client/features/planner/SavedWeeksPage.tsx`
- Modify: `src/client/features/planner/WeekPage.tsx`
- Modify: `src/client/app/router.tsx`
- Modify: `src/client/components/AppIcon.tsx`
- Modify: `src/client/components/AppShell.tsx`
- Modify: `src/client/styles/planner.css`
- Test: `tests/client/saved-weeks-page.test.tsx`
- Test: `tests/client/week-page.test.tsx`

**Interfaces:**
- Consumes: `PlannerClient` de Task 2 y `SavedWeekSummary` de Task 1.
- Produces: ruta `/mis-semanas`, guardado desde `/semana` y función pura `nextAvailableWeekStart(currentWeek, savedWeeks)`.

- [x] **Step 1: Escribir pruebas fallidas de UI y fecha siguiente**

Probar estado vacío, listado, abrir, guardar, renombrar, confirmación de borrado, receta faltante y salto de fechas ya guardadas.

- [x] **Step 2: Ejecutar pruebas y confirmar RED**

Run: `pnpm test tests/client/saved-weeks-page.test.tsx tests/client/week-page.test.tsx`

Expected: FAIL porque las pantallas y acciones no existen.

- [x] **Step 3: Implementar UI accesible y responsive**

Mantener cinco destinos principales. Añadir navegación secundaria con enlaces `Crear semana` y `Mis Semanas`, diálogos etiquetados, confirmación destructiva y estados de carga/error/éxito con `aria-live`.

- [x] **Step 4: Ejecutar pruebas enfocadas y confirmar GREEN**

Run: `pnpm test tests/client/saved-weeks-page.test.tsx tests/client/week-page.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: add Mis Semanas experience"
```

### Task 4: Recorrido completo, migración y publicación

**Files:**
- Modify: `e2e/planner-shopping-journey.spec.ts`
- Modify: `docs/superpowers/plans/2026-11-05-saved-weeks-implementation.md`

**Interfaces:**
- Consumes: flujo completo de Tasks 1–3.
- Produces: evidencia E2E, migración aplicada y despliegue verificado.

- [x] **Step 1: Extender E2E y confirmar RED**

Recorrido móvil: crear semana → guardar con nombre → editar compra → abrir desde Mis Semanas → conservar compra → renombrar → crear otra → eliminar con confirmación.

- [x] **Step 2: Ejecutar E2E y corregir solo fallos reales del flujo**

Run: `pnpm exec playwright test e2e/planner-shopping-journey.spec.ts`

Expected: PASS.

- [x] **Step 3: Verificación completa**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm exec playwright test e2e/access-planner-journey.spec.ts e2e/planner-shopping-journey.spec.ts`

Expected: todas las pruebas pasan; bundle con 45 recetas y sin secretos.

- [x] **Step 4: Aplicar migración aditiva y verificar columnas/RPC**

Aplicar `202611050002_saved_weeks.sql` al proyecto Supabase existente, sin reset. Verificar `title`, `saved_at` y las cuatro RPC mediante consultas de solo lectura.

- [x] **Step 5: Commit, push, deploy y smoke tests**

```bash
git add e2e docs
git commit -m "test: verify saved weeks journey"
git push
pnpm deploy
```

Verificar `/api/health`, `/mis-semanas`, guardar/listar/renombrar/eliminar con la sesión de prueba y vista móvil de 375 px.
