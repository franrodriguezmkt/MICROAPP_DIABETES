import { describe, expect, it } from "vitest";

import type { IngredientCatalogEntry } from "../../src/domain/ingredients/ingredientCatalog";
import type { WeeklyPlan } from "../../src/domain/planner/planner";
import type { Recipe } from "../../src/domain/recipes/recipe";
import {
  buildShoppingList,
  formatShoppingQuantity,
  shoppingLineKey,
} from "../../src/domain/planner/buildShoppingList";

const catalog: IngredientCatalogEntry[] = [
  { ingredientId: "tomato", label: "Tomate", category: "produce" },
  { ingredientId: "plant-milk", label: "Leche vegetal", category: "dairy" },
  { ingredientId: "salt", label: "Sal", category: "pantry" },
  {
    ingredientId: "spinach",
    label: "Espinaca",
    category: "produce",
    shoppingGroupId: "leafy-greens",
    shoppingLabel: "Hojas verdes",
  },
  {
    ingredientId: "mixed-greens",
    label: "Hojas verdes mixtas",
    category: "produce",
    shoppingGroupId: "leafy-greens",
    shoppingLabel: "Hojas verdes",
  },
  {
    ingredientId: "olive-oil",
    label: "Aceite de oliva",
    category: "pantry",
    shoppingGroupId: "cooking-oil",
    shoppingLabel: "Aceite para cocinar",
  },
  {
    ingredientId: "sesame-or-olive-oil",
    label: "Aceite de sésamo o de oliva",
    category: "pantry",
    shoppingGroupId: "cooking-oil",
    shoppingLabel: "Aceite para cocinar",
  },
];

function recipe(
  id: string,
  servingsBase: number,
  ingredients: Recipe["ingredients"],
): Recipe {
  return {
    id,
    slug: id,
    title: id,
    summary: `Resumen de ${id}`,
    category: "lunch",
    servingsBase,
    prepMinutes: 5,
    cookMinutes: 5,
    ingredients,
    instructions: ["Preparar."],
    tags: [],
    allergens: [],
    publicationStatus: "approved",
    source: { fileName: "fixture.pdf", pageStart: 1, pageEnd: 1 },
  };
}

const firstRecipe = recipe("lunch-one", 2, [
  {
    ingredientId: "tomato",
    displayName: "tomate",
    quantity: 100,
    unit: "g",
    preparationNote: null,
  },
  {
    ingredientId: "plant-milk",
    displayName: "leche vegetal",
    quantity: 0.5,
    unit: "cup",
    preparationNote: null,
  },
  {
    ingredientId: "salt",
    displayName: "sal",
    quantity: null,
    unit: "to_taste",
    preparationNote: null,
  },
]);

const secondRecipe = recipe("lunch-two", 4, [
  {
    ingredientId: "tomato",
    displayName: "tomate",
    quantity: 200,
    unit: "g",
    preparationNote: null,
  },
  {
    ingredientId: "tomato",
    displayName: "tomate",
    quantity: 1,
    unit: "unit",
    preparationNote: null,
  },
]);

const plan: WeeklyPlan = {
  id: "week:2026-10-19:test",
  weekStart: "2026-10-19",
  people: 2,
  generatorVersion: "planner-v1",
  items: [
    {
      id: "monday-lunch",
      date: "2026-10-19",
      mealType: "lunch",
      recipeId: firstRecipe.id,
      servings: 3,
      replaced: false,
    },
    {
      id: "tuesday-lunch",
      date: "2026-10-20",
      mealType: "lunch",
      recipeId: secondRecipe.id,
      servings: 2,
      replaced: false,
    },
  ],
  notices: [],
};

describe("shopping-list consolidation", () => {
  it("scales servings and sums only compatible canonical lines", () => {
    const items = buildShoppingList({
      plan,
      recipes: [firstRecipe, secondRecipe],
      ingredientCatalog: catalog,
    });

    expect(items).toEqual([
      expect.objectContaining({
        source: "generated",
        id: "generated:tomato:count",
        ingredientId: "tomato",
        quantity: 0.5,
        unit: "unit",
      }),
      expect.objectContaining({
        source: "generated",
        id: "generated:tomato:mass",
        ingredientId: "tomato",
        quantity: 250,
        unit: "g",
      }),
      expect.objectContaining({
        source: "generated",
        id: "generated:plant-milk:culinary-volume",
        ingredientId: "plant-milk",
        quantity: 0.75,
        unit: "cup",
      }),
      expect.objectContaining({
        source: "generated",
        id: "generated:salt:taste",
        ingredientId: "salt",
        quantity: null,
        unit: "to_taste",
      }),
    ]);
  });

  it("uses stable keys and formats decimals for display without changing totals", () => {
    expect(shoppingLineKey("tomato", "g")).toBe("generated:tomato:mass");
    expect(formatShoppingQuantity(2 / 3)).toBe("0,67");

    const items = buildShoppingList({
      plan: {
        ...plan,
        items: [{ ...plan.items[0]!, servings: 1 }],
      },
      recipes: [firstRecipe],
      ingredientCatalog: catalog,
    });

    expect(items.find((item) => item.id === "generated:tomato:mass")).toMatchObject(
      { quantity: 50 },
    );
  });

  it("merges equivalent ingredients, compatible cooking measures and al gusto", () => {
    const greenRecipe = recipe("greens", 2, [
      {
        ingredientId: "spinach",
        displayName: "espinaca",
        quantity: 1,
        unit: "cup",
        preparationNote: null,
      },
      {
        ingredientId: "mixed-greens",
        displayName: "hojas verdes mixtas",
        quantity: 2,
        unit: "cup",
        preparationNote: null,
      },
      {
        ingredientId: "spinach",
        displayName: "espinaca",
        quantity: null,
        unit: "to_taste",
        preparationNote: null,
      },
      {
        ingredientId: "olive-oil",
        displayName: "aceite de oliva",
        quantity: 2,
        unit: "tsp",
        preparationNote: null,
      },
      {
        ingredientId: "sesame-or-olive-oil",
        displayName: "aceite de sésamo o de oliva",
        quantity: 1,
        unit: "tbsp",
        preparationNote: null,
      },
    ]);
    const items = buildShoppingList({
      plan: {
        ...plan,
        items: [{ ...plan.items[0]!, recipeId: greenRecipe.id, servings: 2 }],
      },
      recipes: [greenRecipe],
      ingredientCatalog: catalog,
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "generated:leafy-greens:culinary-volume",
          ingredientId: "leafy-greens",
          label: "Hojas verdes",
          quantity: 3,
          unit: "cup",
          includesToTaste: true,
        }),
        expect.objectContaining({
          id: "generated:cooking-oil:culinary-volume",
          ingredientId: "cooking-oil",
          label: "Aceite para cocinar",
          quantity: 1.67,
          unit: "tbsp",
        }),
      ]),
    );
    expect(items.filter((item) => item.label === "Hojas verdes")).toHaveLength(1);
    expect(items.filter((item) => item.label === "Aceite para cocinar")).toHaveLength(1);
  });

  it("retains matching checkmarks and untouched manual lines after a plan change", () => {
    const manualItem = {
      source: "manual" as const,
      id: "manual:one",
      label: "Servilletas",
      quantity: 2,
      unitLabel: "paquetes",
      category: "other" as const,
      checked: true,
    };
    const previousItems = [
      {
        source: "generated" as const,
        id: "generated:tomato:mass",
        ingredientId: "tomato",
        label: "Tomate",
        quantity: 999,
        unit: "g" as const,
        category: "produce" as const,
        checked: true,
        customized: false,
        hidden: false,
        includesToTaste: false,
      },
      manualItem,
    ];
    const items = buildShoppingList({
      plan: { ...plan, items: [plan.items[1]!] },
      recipes: [firstRecipe, secondRecipe],
      ingredientCatalog: catalog,
      previousItems,
    });

    expect(items.find((item) => item.id === "generated:tomato:mass")).toMatchObject(
      { quantity: 100, checked: true },
    );
    expect(items.at(-1)).toEqual(manualItem);
  });
});
