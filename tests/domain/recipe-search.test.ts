import { describe, expect, it } from "vitest";

import type { Recipe } from "../../src/domain/recipes/recipe";
import {
  matchesRecipe,
  normalizeSearchText,
} from "../../src/domain/recipes/recipeSearch";
import { createJsonRecipeRepository } from "../../src/infrastructure/recipes/jsonRecipeRepository";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "recipe-dessert-01",
    slug: "pudin-de-chia",
    title: "Pudín de Chía",
    summary: "Preparación fría con vainilla.",
    category: "dessert",
    servingsBase: 2,
    prepMinutes: 120,
    cookMinutes: 0,
    ingredients: [
      {
        ingredientId: "chia-seeds",
        displayName: "semillas de chía",
        quantity: 4,
        unit: "tbsp",
        preparationNote: null,
      },
    ],
    instructions: ["Mezcla y refrigera."],
    tags: ["postre frío"],
    allergens: [],
    publicationStatus: "draft",
    source: {
      fileName: "recetas.pdf",
      pageStart: 1,
      pageEnd: 2,
    },
    ...overrides,
  };
}

describe("recipe search", () => {
  it("normalizes accents, case and repeated whitespace", () => {
    expect(normalizeSearchText("  PUDÍN   de Chía ")).toBe("pudin de chia");
  });

  it("matches search without case or accents", () => {
    expect(matchesRecipe(recipe(), { search: "pudin chia" })).toBe(true);
  });

  it("searches ingredient display names and tags", () => {
    expect(matchesRecipe(recipe(), { search: "semillas fria" })).toBe(true);
  });

  it("excludes a recipe containing an excluded ingredient", () => {
    const withPeanut = recipe({
      ingredients: [
        {
          ingredientId: "peanut",
          displayName: "maní",
          quantity: 1,
          unit: "tbsp",
          preparationNote: null,
        },
      ],
    });

    expect(
      matchesRecipe(withPeanut, { excludedIngredientIds: ["peanut"] }),
    ).toBe(false);
  });
});

describe("JSON recipe repository", () => {
  const draftRecipe = recipe();
  const approvedRecipe = recipe({
    id: "recipe-dessert-02",
    slug: "fruta-fresca",
    title: "Fruta fresca",
    publicationStatus: "approved",
  });

  it("hides draft recipes when content preview is disabled", async () => {
    const repository = createJsonRecipeRepository(
      [draftRecipe, approvedRecipe],
      { contentPreview: false },
    );

    await expect(repository.list()).resolves.toEqual([approvedRecipe]);
  });

  it("does not let a query override a production repository", async () => {
    const repository = createJsonRecipeRepository([draftRecipe], {
      contentPreview: false,
    });

    await expect(repository.list({ includeDrafts: true })).resolves.toEqual([]);
    await expect(
      repository.getBySlug(draftRecipe.slug, { includeDrafts: true }),
    ).resolves.toBeNull();
    await expect(
      repository.getById(draftRecipe.id, { includeDrafts: true }),
    ).resolves.toBeNull();
  });

  it("shows drafts only when both preview and the query allow them", async () => {
    const repository = createJsonRecipeRepository([draftRecipe], {
      contentPreview: true,
    });

    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.list({ includeDrafts: true })).resolves.toEqual([
      draftRecipe,
    ]);
    await expect(repository.getById(draftRecipe.id)).resolves.toBeNull();
    await expect(
      repository.getById(draftRecipe.id, { includeDrafts: true }),
    ).resolves.toEqual(draftRecipe);
    await expect(repository.getById("missing-recipe")).resolves.toBeNull();
  });
});
