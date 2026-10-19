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
  return (
    <div className="planner-dialog-backdrop">
      <section
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
