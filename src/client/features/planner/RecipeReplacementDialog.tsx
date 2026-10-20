import { useEffect, useRef } from "react";

import type { PlannedMealType } from "../../../domain/planner/planner";
import type { Recipe } from "../../../domain/recipes/recipe";

const mealLabels: Record<PlannedMealType, string> = {
  breakfast: "desayuno",
  lunch: "almuerzo",
  dinner: "cena",
  snack: "snack",
};

type RecipeReplacementDialogProps = {
  mealType: PlannedMealType;
  recipes: Recipe[];
  busy: boolean;
  onChoose: (recipeId: string) => void;
  onClose: () => void;
};

export function RecipeReplacementDialog({
  mealType,
  recipes,
  busy,
  onChoose,
  onClose,
}: RecipeReplacementDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="planner-dialog-backdrop">
      <section
        ref={dialogRef}
        className="planner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replacement-title"
      >
        <div className="planner-dialog__heading">
          <div>
            <p className="eyebrow">Solo cambia esta comida</p>
            <h2 id="replacement-title">Cambiar {mealLabels[mealType]}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="planner-icon-button planner-control"
            type="button"
            onClick={onClose}
            aria-label="Cerrar opciones"
          >
            ×
          </button>
        </div>
        <div className="replacement-list">
          {recipes.map((recipe) => (
            <article className="replacement-option" key={recipe.id}>
              <div>
                <h3>{recipe.title}</h3>
                <p>{recipe.summary}</p>
              </div>
              <button
                className="planner-button planner-control"
                type="button"
                disabled={busy}
                onClick={() => onChoose(recipe.id)}
                aria-label={`Elegir ${recipe.title}`}
              >
                Elegir
              </button>
            </article>
          ))}
          {recipes.length === 0 ? (
            <p className="planner-muted">No hay otra receta compatible por ahora.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
