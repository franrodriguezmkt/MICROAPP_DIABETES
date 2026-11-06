# Recetas, planificación y marca Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar las 45 recetas ya importadas, hacer visible el catálogo completo de ingredientes, reconstruir semanas antiguas vacías con sus compras y aplicar el logo entregado por el propietario.

**Architecture:** El JSON versionado seguirá siendo la fuente única de recetas e ingredientes. Producción incluirá únicamente recetas autorizadas para publicación; el servicio de planificación detectará versiones antiguas del generador y reconstruirá el plan y la compra derivada sin perder líneas manuales ni marcas compatibles. La interfaz de preferencias mostrará el catálogo de 133 ingredientes mediante divulgación progresiva, y la cabecera consumirá un activo de marca transparente optimizado.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Hono, Cloudflare Workers, JSON validado con Zod.

**Spec:** `docs/superpowers/specs/2026-10-15-full-app-visual-backend-design.md`

## Global Constraints

- Producto de organización de recetas, semana y compras; no control clínico diario.
- Las cinco áreas siguen siendo Semana, Compras, Recetas, Recursos y Cuenta.
- Las 45 recetas se publican por autorización expresa del propietario, sin convertir esa autorización editorial en una promesa médica.
- La lista de compras se deriva siempre del plan vigente y conserva líneas manuales y checks compatibles.
- El formulario debe seguir siendo móvil, accesible, buscable y operable con controles de al menos 44 px.
- Las imágenes individuales de recetas quedan fuera de este cambio; se añadirán cuando el propietario las entregue.

## Review Focus

- Una semana vacía guardada con `planner-v1` debe regenerarse al abrirse con la versión nueva.
- Una semana vigente no debe cambiar cada vez que se abre.
- La reconstrucción debe volver a calcular compras y conservar líneas manuales.
- Buscar un ingrediente fuera de los primeros 24 debe permitir seleccionarlo sin desplegar toda la lista.
- El logo debe conservar proporciones, texto alternativo y no provocar desbordamiento en móvil.

---

### Task 1: Publicación del inventario real

**Files:**
- Modify: `content/recipes/recipes.json`
- Modify: `tests/content/recipes.test.ts`
- Modify: `tests/build/recipe-content.test.ts`
- Modify: `scripts/verify-production-bundle.mjs`

**Interfaces:**
- Consumes: las 45 recetas ya validadas por `recipeCollectionSchema`.
- Produces: un bundle de producción con 45 recetas publicables y sin contenido de borrador.

- [ ] Escribir pruebas que exijan 45 recetas publicables en el inventario y el bundle.
- [ ] Ejecutar las pruebas y confirmar que fallan porque las 45 recetas siguen en `draft`.
- [ ] Cambiar mecánicamente su estado a `approved` y retirar sólo la etiqueta genérica de revisión, conservando alertas específicas de datos fuente.
- [ ] Ejecutar las pruebas de contenido y build hasta que pasen.
- [ ] Commit.

### Task 2: Reparación versionada de semana y compras

**Files:**
- Modify: `src/domain/planner/generateWeeklyPlan.ts`
- Modify: `src/application/planner/PlannerService.ts`
- Modify: `tests/application/planner-service.test.ts`
- Modify: `tests/domain/weekly-plan-generator.test.ts`

**Interfaces:**
- Consumes: `GENERATOR_VERSION`, recetas publicadas y cualquier `StoredPlannerWeek` existente.
- Produces: `getOrGenerateWeek()` que migra semanas obsoletas y llama a `savePlanWithShopping()` para sincronizar compras.

- [ ] Escribir una prueba con una semana `planner-v1` vacía y una línea manual de compras.
- [ ] Ejecutarla y confirmar que falla porque hoy se devuelve la semana antigua sin regenerar.
- [ ] Subir el generador a `planner-v2` y regenerar sólo cuando la versión guardada no coincide.
- [ ] Verificar que la semana obtiene 28 comidas, las compras generadas aparecen, la línea manual permanece y una segunda apertura es estable.
- [ ] Ejecutar las pruebas de dominio y servicio.
- [ ] Commit.

### Task 3: Catálogo completo de ingredientes en preferencias

**Files:**
- Modify: `src/client/features/planner/PreferencesForm.tsx`
- Modify: `src/client/styles/planner.css`
- Modify: `tests/client/preferences-form.test.tsx`
- Modify: `tests/content/ingredient-catalog.test.ts`

**Interfaces:**
- Consumes: las 133 entradas canónicas de `content/ingredients/catalog.json`.
- Produces: búsqueda sin acentos, selección persistente y control para mostrar/ocultar el listado completo.

- [ ] Escribir pruebas para un ingrediente situado después del elemento 24 y para el control de 133 ingredientes.
- [ ] Ejecutarlas y confirmar el fallo por el límite fijo actual.
- [ ] Mostrar 24 inicialmente, todos los resultados durante búsqueda y todos al elegir “Ver los 133 ingredientes”; mantener visibles las selecciones actuales.
- [ ] Aplicar estados accesibles y diseño móvil sin scroll horizontal.
- [ ] Ejecutar pruebas de formulario y contenido.
- [ ] Commit.

### Task 4: Logo transparente en la aplicación

**Files:**
- Create: `public/brand/mi-semana-de-recetas-logo.png`
- Modify: `src/client/components/AppShell.tsx`
- Modify: `src/client/styles/shell.css`
- Modify: `tests/client/app-shell.test.tsx`

**Interfaces:**
- Consumes: logo transparente generado desde la imagen entregada.
- Produces: cabecera de aplicación con `<img>` accesible, dimensiones reservadas y variante responsive.

- [ ] Escribir una prueba que exija el logo de marca real y su texto alternativo.
- [ ] Ejecutarla y confirmar el fallo con la marca SVG provisional.
- [ ] Copiar el PNG transparente al proyecto e integrarlo en la cabecera sin duplicar el nombre visible.
- [ ] Verificar proporciones y comportamiento en móvil/escritorio.
- [ ] Ejecutar pruebas de shell.
- [ ] Commit.

### Task 5: Verificación y entrega

**Files:**
- Verify: all changed files and production bundle.

**Interfaces:**
- Consumes: las cuatro tareas anteriores.
- Produces: artefacto verificable listo para Cloudflare.

- [ ] Ejecutar `pnpm test`.
- [ ] Ejecutar `pnpm typecheck`.
- [ ] Ejecutar `pnpm build` y confirmar que el verificador informa 45 recetas publicadas y ningún secreto cliente.
- [ ] Ejecutar recorridos mínimos del planificador y catálogo.
- [ ] Revisar el diff completo y corregir sólo hallazgos importantes mediante RED→GREEN.
- [ ] Desplegar a Cloudflare y comprobar Recetas, Semana y Compras en producción.

