import { describe, expect, it } from "vitest";

import { recipeSchema } from "../../src/domain/recipes/recipe";

const validRecipe = {
  id: "recipe-breakfast-01",
  slug: "avena-canela-manzana",
  title: "Avena con canela y manzana",
  summary: "Desayuno de avena con fruta y especias.",
  category: "breakfast",
  servingsBase: 2,
  prepMinutes: 10,
  cookMinutes: 10,
  ingredients: [
    {
      ingredientId: "rolled-oats",
      displayName: "avena en hojuelas",
      quantity: 100,
      unit: "g",
      preparationNote: null,
    },
  ],
  instructions: ["Combina los ingredientes.", "Cocina hasta espesar."],
  tags: ["desayuno"],
  allergens: [],
  publicationStatus: "draft",
  source: {
    fileName: "10 RECETAS DE DESAYUNOS PARA DIABÉTICOS.pdf",
    pageStart: 3,
    pageEnd: 3,
  },
} as const;

function recipeWithQuantity(quantity: number) {
  return {
    ...validRecipe,
    ingredients: [{ ...validRecipe.ingredients[0], quantity }],
  };
}

describe("recipe schema", () => {
  it("accepts a complete recipe with source provenance", () => {
    expect(recipeSchema.parse(validRecipe)).toMatchObject({
      slug: "avena-canela-manzana",
      publicationStatus: "draft",
    });
  });

  it.each([
    "/recipes/avena-canela-manzana.webp",
    "/recipes/avena-canela-manzana.avif",
  ])("accepts_a_local_optimized_recipe_image_path: %s", (imagePath) => {
    expect(recipeSchema.parse({ ...validRecipe, imagePath })).toMatchObject({
      imagePath,
    });
  });

  it.each([
    "https://images.example.com/avena.webp",
    "../recipes/avena.webp",
    "/recipes/avena.png",
    "/recipes/avena con canela.webp",
  ])("rejects_remote_or_unversioned_recipe_image_paths: %s", (imagePath) => {
    expect(() => recipeSchema.parse({ ...validRecipe, imagePath })).toThrow();
  });

  it.each(["", "../escape", "Con Espacios"])(
    "rejects invalid slug %s",
    (slug) => {
      expect(() => recipeSchema.parse({ ...validRecipe, slug })).toThrow();
    },
  );

  it("rejects an ingredient with a non-positive quantity", () => {
    expect(() => recipeSchema.parse(recipeWithQuantity(0))).toThrow();
  });

  it("requires an unnumbered quantity for ingredients added to taste", () => {
    const recipe = {
      ...validRecipe,
      ingredients: [
        {
          ...validRecipe.ingredients[0],
          quantity: 1,
          unit: "to_taste",
        },
      ],
    };

    expect(() => recipeSchema.parse(recipe)).toThrow();
  });
});
