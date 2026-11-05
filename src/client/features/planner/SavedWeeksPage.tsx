import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import rawRecipes from "virtual:recipe-content";

import type { SavedWeekSummary } from "../../../domain/planner/planner";
import type { Recipe } from "../../../domain/recipes/recipe";
import { RecipeVisual } from "../../components/RecipeVisual";
import { plannerClient, type PlannerClient } from "../../lib/plannerClient";
import { mondayFor } from "../../lib/weekStart";
import {
  formatWeekRange,
  nextAvailableWeekStart,
} from "./savedWeekViewModel";
import { WeekSectionNav } from "./WeekSectionNav";

type SavedWeeksPageProps = {
  client?: PlannerClient;
  recipes?: ReadonlyArray<Recipe>;
  initialWeekStart?: string;
};

type PageState = "loading" | "ready" | "error";

export function SavedWeeksPage({
  client = plannerClient,
  recipes = rawRecipes,
  initialWeekStart = mondayFor(),
}: SavedWeeksPageProps) {
  const navigate = useNavigate();
  const activeRequest = useRef<AbortController | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [weeks, setWeeks] = useState<SavedWeekSummary[]>([]);
  const [renaming, setRenaming] = useState<SavedWeekSummary | null>(null);
  const [deleting, setDeleting] = useState<SavedWeekSummary | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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

  async function load() {
    const controller = nextController();
    setState("loading");
    try {
      setWeeks(await client.listSavedWeeks(controller.signal));
      setState("ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    }
  }

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
    // This page owns one initial library load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createNextWeek() {
    const weekStart = nextAvailableWeekStart(initialWeekStart, weeks);
    navigate(`/semana?week=${encodeURIComponent(weekStart)}`);
  }

  function beginRename(week: SavedWeekSummary) {
    setRenaming(week);
    setName(week.title);
    setMessage("");
  }

  async function confirmRename() {
    if (!renaming || !name.trim()) return;
    const controller = nextController();
    setBusy(true);
    setMessage("");
    try {
      const updated = await client.renameSavedWeek(
        renaming.weekStart,
        name.trim(),
        controller.signal,
      );
      setWeeks((current) =>
        current.map((week) =>
          week.weekStart === updated.weekStart ? updated : week,
        ),
      );
      setRenaming(null);
      setMessage("Nombre actualizado.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessage("No pudimos cambiar el nombre. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const controller = nextController();
    setBusy(true);
    setMessage("");
    try {
      await client.deleteSavedWeek(deleting.weekStart, controller.signal);
      setWeeks((current) =>
        current.filter((week) => week.weekStart !== deleting.weekStart),
      );
      setDeleting(null);
      setMessage("Semana eliminada.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessage("No pudimos eliminar la semana. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="planner-page saved-weeks-page" aria-labelledby="saved-weeks-title">
      <WeekSectionNav />
      <header className="planner-hero saved-weeks-hero">
        <div>
          <p className="eyebrow">Tu biblioteca personal</p>
          <h1 id="saved-weeks-title">Mis Semanas</h1>
          <p>Guarda tus menús completos y vuelve a ellos con sus compras.</p>
        </div>
        {state === "ready" && weeks.length > 0 ? (
          <button className="planner-button planner-control" type="button" onClick={createNextWeek}>
            Crear otra semana
          </button>
        ) : null}
      </header>

      {message ? <p className="planner-save-status" aria-live="polite">{message}</p> : null}

      {state === "loading" ? (
        <p className="planner-muted" aria-live="polite">Cargando tus semanas…</p>
      ) : null}

      {state === "error" ? (
        <section className="planner-panel planner-error" role="alert">
          <p>No pudimos cargar tus semanas guardadas.</p>
          <button className="planner-button planner-control" type="button" onClick={() => void load()}>
            Reintentar
          </button>
        </section>
      ) : null}

      {state === "ready" && weeks.length === 0 ? (
        <section className="saved-weeks-empty">
          <h2>Todavía no guardaste semanas</h2>
          <p>Cuando guardes un menú, aparecerá aquí junto con su lista de compras.</p>
          <button className="planner-button planner-control" type="button" onClick={createNextWeek}>
            Crear mi primera semana
          </button>
        </section>
      ) : null}

      {state === "ready" && weeks.length > 0 ? (
        <div className="saved-weeks-grid">
          {weeks.map((week) => {
            const preview = week.previewRecipeId
              ? recipeById.get(week.previewRecipeId)
              : undefined;
            return (
              <article className="saved-week-card" key={week.weekStart} aria-label={week.title}>
                {preview ? (
                  <RecipeVisual recipe={preview} variant="card" />
                ) : (
                  <div className="saved-week-card__placeholder" aria-hidden="true">
                    Menú guardado
                  </div>
                )}
                <div className="saved-week-card__body">
                  <p className="eyebrow">{formatWeekRange(week.weekStart)}</p>
                  <h2>{week.title}</h2>
                  <p>{week.people} {week.people === 1 ? "persona" : "personas"} · {week.mealCount} comidas</p>
                  <div className="saved-week-card__actions">
                    <Link className="planner-button planner-control" to={`/semana?week=${encodeURIComponent(week.weekStart)}`}>
                      Abrir semana
                    </Link>
                    <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => beginRename(week)}>
                      Renombrar
                    </button>
                    <button className="planner-button planner-button--danger planner-control" type="button" onClick={() => setDeleting(week)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {renaming ? (
        <div className="planner-dialog-backdrop">
          <section className="planner-dialog planner-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="rename-week-title">
            <h2 id="rename-week-title">Renombrar semana</h2>
            <label className="planner-dialog__field" htmlFor="saved-week-name">
              Nombre de la semana
              <input id="saved-week-name" className="planner-input" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="planner-actions">
              <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => setRenaming(null)}>Cancelar</button>
              <button className="planner-button planner-control" type="button" disabled={busy || !name.trim()} onClick={() => void confirmRename()}>Guardar nombre</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleting ? (
        <div className="planner-dialog-backdrop">
          <section className="planner-dialog planner-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="delete-week-title">
            <h2 id="delete-week-title">Eliminar semana</h2>
            <p>Se eliminará <strong>{deleting.title}</strong> y su lista de compras. Esta acción no se puede deshacer.</p>
            <div className="planner-actions">
              <button className="planner-button planner-button--quiet planner-control" type="button" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="planner-button planner-button--danger planner-control" type="button" disabled={busy} onClick={() => void confirmDelete()}>Sí, eliminar</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
