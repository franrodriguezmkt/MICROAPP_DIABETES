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
    const approvedRecipe = {
      ...structuredClone(rawRecipes[0]),
      id: "approved-recipe",
      slug: "approved-recipe",
      publicationStatus: "approved" as const,
    };

    expect(
      prepareRecipeContent([rawRecipes[0], approvedRecipe], "production"),
    ).toEqual([approvedRecipe]);
    expect(prepareRecipeContent(rawRecipes, "production")).toEqual([]);
  });

  it("keeps drafts available outside production for editorial preview", () => {
    expect(prepareRecipeContent(rawRecipes, "development")).toHaveLength(45);
  });
});
