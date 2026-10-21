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
      {
        source: "generated",
        id: "generated:tomato:g",
        ingredientId: "tomato",
        label: "Tomate",
        quantity: 250,
        unit: "g",
        category: "produce",
        checked: false,
      },
      {
        source: "generated",
        id: "generated:tomato:unit",
        ingredientId: "tomato",
        label: "Tomate",
        quantity: 0.5,
        unit: "unit",
        category: "produce",
        checked: false,
      },
      {
        source: "generated",
        id: "generated:plant-milk:cup",
        ingredientId: "plant-milk",
        label: "Leche vegetal",
        quantity: 0.75,
        unit: "cup",
        category: "dairy",
        checked: false,
      },
      {
        source: "generated",
        id: "generated:salt:to_taste",
        ingredientId: "salt",
        label: "Sal",
        quantity: null,
        unit: "to_taste",
        category: "pantry",
        checked: false,
      },
    ]);
  });

  it("uses stable keys and formats decimals for display without changing totals", () => {
    expect(shoppingLineKey("tomato", "g")).toBe("generated:tomato:g");
    expect(formatShoppingQuantity(2 / 3)).toBe("0,67");

    const items = buildShoppingList({
      plan: {
        ...plan,
        items: [{ ...plan.items[0]!, servings: 1 }],
      },
      recipes: [firstRecipe],
      ingredientCatalog: catalog,
    });

    expect(items.find((item) => item.id === "generated:tomato:g")).toMatchObject(
      { quantity: 50 },
    );
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
        id: "generated:tomato:g",
        ingredientId: "tomato",
        label: "Tomate",
        quantity: 999,
        unit: "g" as const,
        category: "produce" as const,
        checked: true,
      },
      manualItem,
    ];
    const items = buildShoppingList({
      plan: { ...plan, items: [plan.items[1]!] },
      recipes: [firstRecipe, secondRecipe],
      ingredientCatalog: catalog,
      previousItems,
    });

    expect(items.find((item) => item.id === "generated:tomato:g")).toMatchObject(
      { quantity: 100, checked: true },
    );
    expect(items.at(-1)).toEqual(manualItem);
  });
});
