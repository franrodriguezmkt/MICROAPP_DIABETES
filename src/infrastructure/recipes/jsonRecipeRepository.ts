import {
  recipeCollectionSchema,
  type Recipe,
} from "../../domain/recipes/recipe";
import type {
  RecipeQuery,
  RecipeRepository,
} from "../../domain/recipes/recipeRepository";
import { matchesRecipe } from "../../domain/recipes/recipeSearch";

type JsonRecipeRepositoryConfig = {
  contentPreview: boolean;
};

export function createJsonRecipeRepository(
  input: unknown,
  config: JsonRecipeRepositoryConfig,
): RecipeRepository {
  const recipes = recipeCollectionSchema.parse(input);

  function isVisible(recipe: Recipe, includeDrafts = false) {
    return (
      recipe.publicationStatus === "approved" ||
      (config.contentPreview && includeDrafts)
    );
  }

  return {
    async list(query: RecipeQuery = {}) {
      return recipes.filter(
        (recipe) =>
          isVisible(recipe, query.includeDrafts) && matchesRecipe(recipe, query),
      );
    },

    async getById(id, options = {}) {
      return (
        recipes.find(
          (recipe) =>
            recipe.id === id && isVisible(recipe, options.includeDrafts),
        ) ?? null
      );
    },

    async getBySlug(slug, options = {}) {
      return (
        recipes.find(
          (recipe) =>
            recipe.slug === slug &&
            isVisible(recipe, options.includeDrafts),
        ) ?? null
      );
    },
  };
}
