import type { Plugin } from "vite";

import {
  recipeCollectionSchema,
  type Recipe,
} from "../src/domain/recipes/recipe.ts";

const virtualModuleId = "virtual:recipe-content";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

export function prepareRecipeContent(input: unknown, mode: string): Recipe[] {
  const recipes = recipeCollectionSchema.parse(input);

  return mode === "production"
    ? recipes.filter((recipe) => recipe.publicationStatus === "approved")
    : recipes;
}

export function recipeContentPlugin(input: unknown, mode: string): Plugin {
  const recipes = prepareRecipeContent(input, mode);

  return {
    name: "validated-recipe-content",
    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : null;
    },
    load(id) {
      return id === resolvedVirtualModuleId
        ? `export default ${JSON.stringify(recipes)};`
        : null;
    },
  };
}
