import type { Recipe } from "./recipe";
import type { RecipeQuery } from "./recipeRepository";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

export function matchesRecipe(recipe: Recipe, query: RecipeQuery): boolean {
  if (query.category && recipe.category !== query.category) {
    return false;
  }

  if (
    query.excludedIngredientIds?.some((ingredientId) =>
      recipe.ingredients.some(
        (ingredient) => ingredient.ingredientId === ingredientId,
      ),
    )
  ) {
    return false;
  }

  const search = normalizeSearchText(query.search ?? "");
  if (!search) {
    return true;
  }

  const searchableText = normalizeSearchText(
    [
      recipe.title,
      recipe.summary,
      ...recipe.ingredients.map((ingredient) => ingredient.displayName),
      ...recipe.tags,
    ].join(" "),
  );

  return search.split(" ").every((term) => searchableText.includes(term));
}
