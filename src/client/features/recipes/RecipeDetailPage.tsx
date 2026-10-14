import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { Recipe } from "../../../domain/recipes/recipe";
import type { RecipeRepository } from "../../../domain/recipes/recipeRepository";
import { scaleIngredient } from "../../../domain/recipes/servingScale";
import { EmptyState } from "../../components/EmptyState";
import { recipeRepository } from "../../lib/content";
import {
  formatAllergenLabels,
  formatIngredientQuantity,
} from "./recipeViewModel";

export function RecipeDetailPage({
  repository = recipeRepository,
}: {
  repository?: RecipeRepository;
}) {
  const { slug = "" } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [servingsInput, setServingsInput] = useState("1");

  useEffect(() => {
    let active = true;
    setLoading(true);

    void repository
      .getBySlug(slug, { includeDrafts: true })
      .then((nextRecipe) => {
        if (!active) return;
        setRecipe(nextRecipe);
        if (nextRecipe) {
          setServings(nextRecipe.servingsBase);
          setServingsInput(String(nextRecipe.servingsBase));
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repository, slug]);

  if (loading) {
    return <p className="detail-status" aria-live="polite">Cargando receta…</p>;
  }

  if (!recipe) {
    return (
      <section className="page-section">
        <EmptyState
          title="No encontramos esta receta"
          description="Puede que el enlace haya cambiado. Vuelve a la biblioteca para elegir otra opción."
        />
        <p className="centered-action">
          <Link className="text-link" to="/recetas">Volver a las recetas</Link>
        </p>
      </section>
    );
  }

  const scaledIngredients = recipe.ingredients.map((ingredient) =>
    scaleIngredient(ingredient, recipe.servingsBase, servings),
  );
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  function handleServingsChange(value: string) {
    setServingsInput(value);
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) {
      setServings(parsed);
    }
  }

  return (
    <article className="recipe-detail">
      <Link className="back-link" to="/recetas">← Volver a recetas</Link>

      <header className="recipe-detail__header">
        <div className={`detail-visual detail-visual--${recipe.category}`} aria-hidden="true">
          <span className="plate-motif" />
          <span className="leaf-motif" />
        </div>
        <div className="recipe-detail__intro">
          <p className="eyebrow">Receta en biblioteca</p>
          <h1>{recipe.title}</h1>
          <p>{recipe.summary}</p>
          <div className="recipe-detail__meta">
            <span>{totalMinutes > 0 ? `${totalMinutes} min` : "Tiempo por confirmar"}</span>
            <span>Base: {recipe.servingsBase} {recipe.servingsBase === 1 ? "porción" : "porciones"}</span>
          </div>
        </div>
      </header>

      <div className="recipe-detail__layout">
        <section className="detail-panel" aria-labelledby="ingredients-title">
          <div className="section-heading-row">
            <h2 id="ingredients-title">Ingredientes</h2>
            <div className="servings-field">
              <label htmlFor="servings">Porciones</label>
              <input
                id="servings"
                type="number"
                inputMode="numeric"
                min="1"
                max="12"
                step="1"
                value={servingsInput}
                onChange={(event) => handleServingsChange(event.target.value)}
                onBlur={() => setServingsInput(String(servings))}
              />
            </div>
          </div>
          <ul className="ingredient-list">
            {scaledIngredients.map((ingredient) => (
              <li key={`${ingredient.ingredientId}-${ingredient.displayName}`}>
                <span className="ingredient-quantity">
                  {formatIngredientQuantity(ingredient.quantity, ingredient.unit)}
                </span>
                <span>
                  {ingredient.displayName}
                  {ingredient.preparationNote ? `, ${ingredient.preparationNote}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-panel" aria-labelledby="instructions-title">
          <h2 id="instructions-title">Preparación</h2>
          <ol className="instruction-list">
            {recipe.instructions.map((instruction, index) => (
              <li key={`${index}-${instruction}`}>{instruction}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.allergens.length > 0 ? (
        <section className="allergen-note" aria-labelledby="allergens-title">
          <h2 id="allergens-title">Alérgenos por revisar</h2>
          <p>{formatAllergenLabels(recipe.allergens)}</p>
        </section>
      ) : null}

      <aside className="educational-notice">
        <strong>Uso educativo</strong>
        <p>
          Esta receta ayuda a organizar comidas y no reemplaza la indicación de un profesional de la salud.
        </p>
      </aside>
    </article>
  );
}
