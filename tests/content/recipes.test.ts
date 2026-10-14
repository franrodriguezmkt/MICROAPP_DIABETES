import { describe, expect, it } from "vitest";

import rawRecipes from "../../content/recipes/recipes.json";
import sourceManifest from "../../content/recipes/sources.json";
import {
  recipeCollectionSchema,
  type Recipe,
  type RecipeCategory,
} from "../../src/domain/recipes/recipe";

function countBy(recipes: Recipe[], key: "category") {
  return recipes.reduce<Partial<Record<RecipeCategory, number>>>(
    (counts, recipe) => ({
      ...counts,
      [recipe[key]]: (counts[recipe[key]] ?? 0) + 1,
    }),
    {},
  );
}

function uniqueValues<T extends Record<string, unknown>>(
  records: T[],
  key: keyof T,
) {
  return [...new Set(records.map((record) => record[key]))];
}

describe("recipe content inventory", () => {
  it("contains the complete recipe inventory", () => {
    const recipes = recipeCollectionSchema.parse(rawRecipes);

    expect(recipes).toHaveLength(45);
    expect(countBy(recipes, "category")).toEqual({
      breakfast: 10,
      lunch: 10,
      dinner: 10,
      snack: 5,
      dessert: 10,
    });
  });

  it("keeps all imported content out of production until reviewed", () => {
    expect(
      rawRecipes.every(
        (recipe) => recipe.publicationStatus === "draft",
      ),
    ).toBe(true);
  });

  it("has unique ids, slugs and valid source page ranges", () => {
    expect(uniqueValues(rawRecipes, "id")).toHaveLength(45);
    expect(uniqueValues(rawRecipes, "slug")).toHaveLength(45);
    expect(
      rawRecipes.every(
        ({ source }) =>
          source.pageStart >= 1 && source.pageEnd >= source.pageStart,
      ),
    ).toBe(true);
  });

  it("records all nine source documents with their page counts", () => {
    expect(sourceManifest).toHaveLength(9);
    expect(sourceManifest.every(({ pageCount }) => pageCount > 0)).toBe(true);
  });

  it("rejects unsupported units and duplicate slugs", () => {
    const recipes = recipeCollectionSchema.parse(rawRecipes);
    const unsupportedUnit = structuredClone(recipes[0]) as Record<
      string,
      unknown
    >;
    const ingredients = unsupportedUnit.ingredients as Array<
      Record<string, unknown>
    >;
    ingredients[0].unit = "handful";

    expect(() => recipeCollectionSchema.parse([unsupportedUnit])).toThrow();
    expect(() =>
      recipeCollectionSchema.parse([recipes[0], recipes[0]]),
    ).toThrow();
  });
});
