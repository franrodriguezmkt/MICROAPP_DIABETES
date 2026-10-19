import { useEffect, useMemo, useRef, useState } from "react";
import rawIngredientCatalog from "../../../../content/ingredients/catalog.json";
import rawRecipes from "virtual:recipe-content";

import {
  ingredientCatalogSchema,
  type IngredientCatalogEntry,
} from "../../../domain/ingredients/ingredientCatalog";
import type {
  PlannerPreferences,
  WeeklyPlan,
  WeeklyPlanItem,
} from "../../../domain/planner/planner";
import type { Recipe } from "../../../domain/recipes/recipe";
import { plannerClient, type PlannerClient } from "../../lib/plannerClient";
import { PreferencesForm } from "./PreferencesForm";
import { RecipeReplacementDialog } from "./RecipeReplacementDialog";
import { WeekMealCard } from "./WeekMealCard";

type WeekPageProps = {
  client?: PlannerClient;
  recipes?: ReadonlyArray<Recipe>;
  ingredientCatalog?: IngredientCatalogEntry[];
  initialWeekStart?: string;
};

type PageState = "loading" | "onboarding" | "ready" | "error";

function mondayFor(date = new Date()) {
  const result = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(isoDate: string) {
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function WeekPage({
  client = plannerClient,
  recipes = rawRecipes,
  ingredientCatalog = ingredientCatalogSchema.parse(rawIngredientCatalog),
  initialWeekStart = mondayFor(),
}: WeekPageProps) {
  const [state, setState] = useState<PageState>("loading");
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [preferences, setPreferences] = useState<PlannerPreferences | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [pendingPreferences, setPendingPreferences] = useState<PlannerPreferences | null>(null);
  const [replacementItem, setReplacementItem] = useState<WeeklyPlanItem | null>(null);
  const [confirmRegeneration, setConfirmRegeneration] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  function nextController() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller;
  }

  async function loadWeek(targetWeek = weekStart) {
    const controller = nextController();
    setState("loading");
    try {
      const nextPlan = await client.getWeek(targetWeek, controller.signal);
      setPlan(nextPlan);
      setWeekStart(targetWeek);
      setState("ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    }
  }

  async function initialize() {
    const controller = nextController();
    setState("loading");
    try {
      const me = await client.getMe(controller.signal);
      setPreferences(me.preferences);
      if (!me.preferences) {
        setState("onboarding");
        return;
      }
      const nextPlan = await client.getWeek(weekStart, controller.signal);
      setPlan(nextPlan);
      setState("ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    }
  }

  useEffect(() => {
    void initialize();
    return () => activeRequest.current?.abort();
    // The initial load intentionally runs once for this route instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createFirstWeek(nextPreferences: PlannerPreferences) {
    const controller = nextController();
    setBusy(true);
    try {
      const saved = await client.updatePreferences(
        nextPreferences,
        false,
        controller.signal,
      );
      setPreferences(saved);
      const nextPlan = await client.getWeek(weekStart, controller.signal);
      setPlan(nextPlan);
      setState("ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    } finally {
      setBusy(false);
    }
  }

  async function replaceRecipe(recipeId: string) {
    if (!replacementItem) return;
    const controller = nextController();
    setBusy(true);
    try {
      const nextPlan = await client.replaceItem(
        weekStart,
        replacementItem.id,
        recipeId,
        controller.signal,
      );
      setPlan(nextPlan);
      setReplacementItem(null);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    const controller = nextController();
    setBusy(true);
    try {
      setPlan(await client.regenerateWeek(weekStart, true, controller.signal));
      setConfirmRegeneration(false);
    } finally {
      setBusy(false);
    }
  }

  async function applyPreferenceChange() {
    if (!pendingPreferences) return;
    const controller = nextController();
    setBusy(true);
    try {
      const saved = await client.updatePreferences(
        pendingPreferences,
        true,
        controller.signal,
      );
      setPreferences(saved);
      setPlan(await client.getWeek(weekStart, controller.signal));
      setPendingPreferences(null);
      setEditingPreferences(false);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <section className="planner-state" aria-live="polite">Preparando tu semana…</section>;
  }

  if (state === "error") {
    return (
      <section className="planner-state" aria-labelledby="planner-error-title" role="alert">
        <h1 id="planner-error-title">No pudimos cargar tu semana</h1>
        <p>Revisa tu conexión y vuelve a intentarlo.</p>
        <button className="planner-button planner-control" type="button" onClick={() => void (preferences ? loadWeek() : initialize())}>
          Reintentar
        </button>
      </section>
    );
  }

  if (state === "onboarding" || !preferences) {
    return (
      <section className="planner-page planner-onboarding" aria-labelledby="planner-onboarding-title">
        <header className="planner-hero">
          <p className="eyebrow">Tu menú, sin empezar de cero</p>
          <h1 id="planner-onboarding-title">Organiza tu semana</h1>
          <p>Elige para cuántas personas cocinas y qué momentos quieres planificar.</p>
        </header>
        <PreferencesForm
          ingredientCatalog={ingredientCatalog}
          onSave={createFirstWeek}
          busy={busy}
        />
      </section>
    );
  }

  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const candidates = replacementItem
    ? recipes.filter(
        (recipe) =>
          recipe.category === replacementItem.mealType &&
          recipe.id !== replacementItem.recipeId &&
          recipe.ingredients.every(
            (ingredient) =>
              !preferences.excludedIngredientIds.includes(ingredient.ingredientId),
          ),
      )
    : [];

  return (
    <section className="planner-page" aria-labelledby="week-title">
      <header className="planner-hero planner-hero--week">
        <div>
          <p className="eyebrow">Menú semanal</p>
          <h1 id="week-title">Tu semana</h1>
          <p>{preferences.people} {preferences.people === 1 ? "persona" : "personas"} · desde {dayLabel(weekStart)}</p>
        </div>
        <div className="planner-actions">
          <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => setEditingPreferences((value) => !value)}>
            Editar preferencias
          </button>
          <button className="planner-button planner-control" type="button" onClick={() => setConfirmRegeneration(true)}>
            Reorganizar semana
          </button>
        </div>
      </header>

      <nav className="week-navigation" aria-label="Cambiar semana">
        <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => void loadWeek(addDays(weekStart, -7))} aria-label="Semana anterior">← Anterior</button>
        <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => void loadWeek(addDays(weekStart, 7))} aria-label="Semana siguiente">Siguiente →</button>
      </nav>

      {editingPreferences ? (
        <div className="planner-panel">
          <PreferencesForm
            ingredientCatalog={ingredientCatalog}
            initialPreferences={preferences}
            onSave={(next) => setPendingPreferences(next)}
            busy={busy}
            submitLabel="Guardar preferencias"
          />
        </div>
      ) : null}

      {plan?.notices.length ? (
        <aside className="planner-notice" role="status">
          {plan.notices.map((notice) => <p key={notice}>{notice}</p>)}
        </aside>
      ) : null}

      <div className="week-days">
        {dates.map((date) => {
          const items = plan?.items.filter((item) => item.date === date) ?? [];
          return (
            <section className="week-day" key={date}>
              <h2>{dayLabel(date)}</h2>
              <div className="week-day__meals">
                {items.map((item) => (
                  <WeekMealCard
                    key={item.id}
                    item={item}
                    recipe={recipeById.get(item.recipeId)}
                    onReplace={() => setReplacementItem(item)}
                  />
                ))}
                {items.length === 0 ? <p className="planner-muted">Sin comidas disponibles para este día.</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      {replacementItem ? (
        <RecipeReplacementDialog
          mealType={replacementItem.mealType}
          recipes={[...candidates]}
          busy={busy}
          onChoose={(recipeId) => void replaceRecipe(recipeId)}
          onClose={() => setReplacementItem(null)}
        />
      ) : null}

      {confirmRegeneration ? (
        <div className="planner-dialog-backdrop">
          <section className="planner-dialog planner-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="regenerate-title">
            <h2 id="regenerate-title">Confirmar reorganización</h2>
            <p>Se propondrá un menú nuevo y se actualizarán los ingredientes generados.</p>
            <div className="planner-actions">
              <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => setConfirmRegeneration(false)}>Cancelar</button>
              <button className="planner-button planner-control" type="button" disabled={busy} onClick={() => void regenerate()}>Sí, reorganizar</button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingPreferences ? (
        <div className="planner-dialog-backdrop">
          <section className="planner-dialog planner-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="preferences-confirm-title">
            <h2 id="preferences-confirm-title">Actualizar semana y compras</h2>
            <p>El cambio ajustará el menú guardado y sus cantidades.</p>
            <div className="planner-actions">
              <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => setPendingPreferences(null)}>Cancelar</button>
              <button className="planner-button planner-control" type="button" disabled={busy} onClick={() => void applyPreferenceChange()}>Confirmar cambios</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
