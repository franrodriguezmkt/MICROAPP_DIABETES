import { describe, expect, it } from "vitest";

import rawCatalog from "../../content/ingredients/catalog.json";
import rawRecipes from "../../content/recipes/recipes.json";
import { ingredientCatalogSchema } from "../../src/domain/ingredients/ingredientCatalog";

describe("canonical ingredient catalog", () => {
  it("defines exactly one categorized Spanish label for every recipe ingredient", () => {
    const catalog = ingredientCatalogSchema.parse(rawCatalog);
    const recipeIngredientIds = new Set(
      rawRecipes.flatMap((recipe) =>
        recipe.ingredients.map((ingredient) => ingredient.ingredientId),
      ),
    );

    expect(catalog).toHaveLength(recipeIngredientIds.size);
    expect(new Set(catalog.map((entry) => entry.ingredientId))).toEqual(
      recipeIngredientIds,
    );
    expect(
      catalog.every(
        (entry) =>
          entry.label.trim().length > 1 &&
          [
            "produce",
            "protein",
            "dairy",
            "pantry",
            "bakery",
            "frozen",
            "other",
          ].includes(entry.category),
      ),
    ).toBe(true);
  });

  it("rejects duplicate ingredient identifiers", () => {
    const duplicate = [rawCatalog[0], rawCatalog[0]];

    expect(() => ingredientCatalogSchema.parse(duplicate)).toThrow();
  });
});
