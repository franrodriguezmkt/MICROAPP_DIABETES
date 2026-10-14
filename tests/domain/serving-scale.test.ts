import { describe, expect, it } from "vitest";

import type { RecipeIngredient } from "../../src/domain/recipes/recipe";
import { scaleIngredient } from "../../src/domain/recipes/servingScale";
import { formatIngredientQuantity } from "../../src/client/features/recipes/recipeViewModel";

function ingredient(
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient {
  return {
    ingredientId: "rolled-oats",
    displayName: "avena",
    quantity: 100,
    unit: "g",
    preparationNote: null,
    ...overrides,
  } as RecipeIngredient;
}

describe("serving scale", () => {
  it("scales from two to three servings without mutating the source", () => {
    const source = ingredient({ quantity: 100, unit: "g" });

    expect(scaleIngredient(source, 2, 3).quantity).toBe(150);
    expect(source.quantity).toBe(100);
  });

  it("keeps to-taste ingredients unnumbered", () => {
    expect(
      scaleIngredient(
        ingredient({ quantity: null, unit: "to_taste" }),
        2,
        4,
      ).quantity,
    ).toBeNull();
  });

  it.each([
    [0, 2],
    [2, 0],
    [2, 13],
    [2, 2.5],
  ])("rejects invalid serving counts %s to %s", (from, to) => {
    expect(() => scaleIngredient(ingredient(), from, to)).toThrow();
  });

  it("formats recurring decimal quantities consistently", () => {
    expect(formatIngredientQuantity(0.333333, "cup")).toBe("0,33 taza");
  });
});
