import { describe, expect, it } from "vitest";

import type { Recipe, RecipeCategory } from "../../src/domain/recipes/recipe";
import type { PlannedMealType } from "../../src/domain/planner/planner";
import {
  GENERATOR_VERSION,
  generateWeeklyPlan,
} from "../../src/domain/planner/generateWeeklyPlan";

function makeRecipe(
  id: string,
  category: RecipeCategory,
  ingredientId = `${id}-ingredient`,
): Recipe {
  return {
    id,
    slug: id,
    title: id,
    summary: `Resumen de ${id}`,
    category,
    servingsBase: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    ingredients: [
      {
        ingredientId,
        displayName: ingredientId,
        quantity: 1,
        unit: "unit",
        preparationNote: null,
      },
    ],
    instructions: ["Preparar."],
    tags: [],
    allergens: [],
    publicationStatus: "approved",
    source: { fileName: "fixture.pdf", pageStart: 1, pageEnd: 1 },
  };
}

const recipes = (["breakfast", "lunch", "dinner", "snack"] as const).flatMap(
  (category) =>
    Array.from({ length: 8 }, (_, index) =>
      makeRecipe(`${category}-${index + 1}`, category),
    ),
);

const baseInput = {
  weekStart: "2026-10-19",
  seed: "preview-user",
  recipes,
  preferences: {
    people: 2,
    enabledMeals: [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
    ] as PlannedMealType[],
    excludedIngredientIds: [],
  },
};

describe("deterministic weekly plan generation", () => {
  it("returns identical plans for the same seed, week and version", () => {
    const first = generateWeeklyPlan(baseInput);
    const second = generateWeeklyPlan(baseInput);

    expect(second).toEqual(first);
    expect(first.generatorVersion).toBe(GENERATOR_VERSION);
    expect(first.items).toHaveLength(28);
    expect(new Set(first.items.map((item) => item.id)).size).toBe(28);
  });

  it("changes stable plan and item identifiers for another week", () => {
    const current = generateWeeklyPlan(baseInput);
    const next = generateWeeklyPlan({
      ...baseInput,
      weekStart: "2026-10-26",
    });

    expect(next.id).not.toBe(current.id);
    expect(next.items[0]?.id).not.toBe(current.items[0]?.id);
    expect(next.items.map((item) => item.recipeId)).not.toEqual(
      current.items.map((item) => item.recipeId),
    );
  });

  it("creates only enabled meal slots with category-compatible recipes", () => {
    const plan = generateWeeklyPlan({
      ...baseInput,
      preferences: {
        ...baseInput.preferences,
        enabledMeals: ["breakfast", "snack"],
      },
    });
    const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    expect(plan.items).toHaveLength(14);
    expect(new Set(plan.items.map((item) => item.mealType))).toEqual(
      new Set(["breakfast", "snack"]),
    );
    expect(
      plan.items.every(
        (item) => recipeById.get(item.recipeId)?.category === item.mealType,
      ),
    ).toBe(true);
  });

  it("filters recipes containing excluded ingredients", () => {
    const excludedId = recipes[0]!.ingredients[0]!.ingredientId;
    const plan = generateWeeklyPlan({
      ...baseInput,
      preferences: {
        ...baseInput.preferences,
        enabledMeals: ["breakfast"],
        excludedIngredientIds: [excludedId],
      },
    });

    expect(plan.items.some((item) => item.recipeId === recipes[0]!.id)).toBe(
      false,
    );
  });

  it("penalizes recent recipes and repeated same-day primary ingredients", () => {
    const breakfastRecent = makeRecipe("breakfast-recent", "breakfast", "egg");
    const breakfastFresh = makeRecipe("breakfast-fresh", "breakfast", "oats");
    const lunchRepeated = makeRecipe("lunch-egg", "lunch", "oats");
    const lunchVaried = makeRecipe("lunch-varied", "lunch", "tomato");
    const plan = generateWeeklyPlan({
      weekStart: "2026-10-19",
      seed: "preview-user",
      recipes: [
        breakfastRecent,
        breakfastFresh,
        lunchRepeated,
        lunchVaried,
      ],
      recentRecipeIds: [breakfastRecent.id],
      preferences: {
        people: 2,
        enabledMeals: ["breakfast", "lunch"],
        excludedIngredientIds: [],
      },
    });
    const firstDay = plan.items.filter((item) => item.date === "2026-10-19");

    expect(firstDay.find((item) => item.mealType === "breakfast")?.recipeId).toBe(
      breakfastFresh.id,
    );
    expect(firstDay.find((item) => item.mealType === "lunch")?.recipeId).toBe(
      lunchVaried.id,
    );
  });

  it("fills seven snack slots from five recipes with minimum repetition", () => {
    const snackRecipes = Array.from({ length: 5 }, (_, index) =>
      makeRecipe(`snack-${index + 1}`, "snack"),
    );
    const plan = generateWeeklyPlan({
      ...baseInput,
      recipes: snackRecipes,
      preferences: {
        people: 2,
        enabledMeals: ["snack"],
        excludedIngredientIds: [],
      },
    });
    const counts = Object.values(
      plan.items.reduce<Record<string, number>>((result, item) => {
        result[item.recipeId] = (result[item.recipeId] ?? 0) + 1;
        return result;
      }, {}),
    );

    expect(plan.items).toHaveLength(7);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(plan.notices.some((notice) => notice.includes("colaciones"))).toBe(
      true,
    );
  });

  it("omits only a meal type with zero compatible recipes", () => {
    const plan = generateWeeklyPlan({
      ...baseInput,
      recipes: recipes.filter((recipe) => recipe.category === "breakfast"),
      preferences: {
        people: 2,
        enabledMeals: ["breakfast", "snack"],
        excludedIngredientIds: [],
      },
    });

    expect(plan.items).toHaveLength(7);
    expect(plan.items.every((item) => item.mealType === "breakfast")).toBe(true);
    expect(plan.notices.some((notice) => notice.includes("colaciones"))).toBe(
      true,
    );
  });
});
