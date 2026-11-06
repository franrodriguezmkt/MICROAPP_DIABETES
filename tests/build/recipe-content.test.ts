import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import rawRecipes from "../../content/recipes/recipes.json";
import { prepareRecipeContent } from "../../build/recipeContent";

describe("production recipe content", () => {
  it("validates the complete source collection before selecting publishable recipes", () => {
    const invalidQuantity = structuredClone(rawRecipes);
    invalidQuantity[0].ingredients[0].quantity = -1;

    const unsupportedUnit = structuredClone(rawRecipes);
    unsupportedUnit[0].ingredients[0].unit = "handful";

    const duplicateSlug = structuredClone(rawRecipes);
    duplicateSlug[1].slug = duplicateSlug[0].slug;

    expect(() => prepareRecipeContent(invalidQuantity, "production")).toThrow();
    expect(() => prepareRecipeContent(unsupportedUnit, "production")).toThrow();
    expect(() => prepareRecipeContent(duplicateSlug, "production")).toThrow();
  });

  it("returns only approved recipes for a production bundle", () => {
    const draftRecipe = {
      ...structuredClone(rawRecipes[0]),
      id: "draft-recipe",
      slug: "draft-recipe",
      publicationStatus: "draft" as const,
    };

    expect(
      prepareRecipeContent([rawRecipes[0], draftRecipe], "production"),
    ).toEqual([rawRecipes[0]]);
    expect(prepareRecipeContent(rawRecipes, "production")).toHaveLength(45);
  });

  it("keeps drafts available outside production for editorial preview", () => {
    expect(prepareRecipeContent(rawRecipes, "development")).toHaveLength(45);
  });

  it("publishes one unique local image for every approved recipe", () => {
    const recipes = prepareRecipeContent(rawRecipes, "production");
    const imagePaths = recipes.map((recipe) => recipe.imagePath);

    expect(imagePaths).toHaveLength(45);
    expect(imagePaths.every(Boolean)).toBe(true);
    expect(new Set(imagePaths).size).toBe(45);

    for (const imagePath of imagePaths) {
      expect(imagePath).toMatch(/^\/recipes\/[a-z0-9-]+\.webp$/);
      expect(
        existsSync(resolve(process.cwd(), "public", imagePath!.slice(1))),
      ).toBe(true);
    }
  });
});
