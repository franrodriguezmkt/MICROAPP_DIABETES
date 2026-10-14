import rawRecipes from "virtual:recipe-content";
import type { RecipeRepository } from "../../domain/recipes/recipeRepository";
import { createJsonRecipeRepository } from "../../infrastructure/recipes/jsonRecipeRepository";

export type ClientContentEnv = {
  MODE: string;
  VITE_CONTENT_PREVIEW?: string;
};

export function createClientRecipeRepository(
  env: ClientContentEnv,
): RecipeRepository {
  const contentPreview =
    env.MODE !== "production" && env.VITE_CONTENT_PREVIEW === "true";

  return createJsonRecipeRepository(rawRecipes, { contentPreview });
}

export const recipeRepository = createClientRecipeRepository(import.meta.env);
