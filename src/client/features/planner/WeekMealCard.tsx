import type { WeeklyPlanItem } from "../../../domain/planner/planner";
import type { Recipe } from "../../../domain/recipes/recipe";
import { RecipeVisual } from "../../components/RecipeVisual";

const mealLabels = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
} as const;

type WeekMealCardProps = {
  item: WeeklyPlanItem;
  recipe?: Recipe;
  onReplace: () => void;
};

export function WeekMealCard({ item, recipe, onReplace }: WeekMealCardProps) {
  return (
    <article className="week-meal-card">
      {recipe ? <RecipeVisual recipe={recipe} variant="card" /> : null}
      <div className="week-meal-card__body">
        <p className="week-meal-card__type">{mealLabels[item.mealType]}</p>
        <h3>{recipe?.title ?? "Receta disponible"}</h3>
        {recipe ? <p>{recipe.summary}</p> : null}
        <div className="week-meal-card__meta">
          <span>{item.servings} porciones</span>
          {item.replaced ? <span>Actualizada</span> : null}
        </div>
        <button
          className="planner-button planner-button--quiet planner-control"
          type="button"
          onClick={onReplace}
          aria-label={`Cambiar receta de ${mealLabels[item.mealType].toLocaleLowerCase("es")}`}
        >
          Cambiar receta
        </button>
      </div>
    </article>
  );
}
