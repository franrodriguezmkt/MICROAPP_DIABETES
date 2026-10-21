import { Link } from "react-router-dom";

import type { Recipe } from "../../domain/recipes/recipe";
import { formatRecipeCategory } from "../features/recipes/recipeViewModel";
import { RecipeVisual } from "./RecipeVisual";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <article className="recipe-card">
      <RecipeVisual recipe={recipe} variant="card" />
      <div className="recipe-card__body">
        <p className="recipe-card__category">
          {formatRecipeCategory(recipe.category)}
        </p>
        <h2>
          <Link to={`/recetas/${recipe.slug}`}>{recipe.title}</Link>
        </h2>
        <p className="recipe-card__summary">{recipe.summary}</p>
        <div className="recipe-card__meta" aria-label="Datos de la receta">
          <span>
            {totalMinutes > 0
              ? `${totalMinutes} min`
              : "Tiempo por confirmar"}
          </span>
          <span>
            {recipe.servingsBase} {recipe.servingsBase === 1 ? "porción" : "porciones"}
          </span>
        </div>
      </div>
    </article>
  );
}
