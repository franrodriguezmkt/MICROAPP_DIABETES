import { describe, expect, it } from "vitest";

import {
  plannerPreferencesSchema,
  shoppingListItemSchema,
  weeklyPlanSchema,
} from "../../src/domain/planner/planner";

const validPreferences = {
  people: 2,
  enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
  excludedIngredientIds: ["peanut"],
};

describe("planner schemas", () => {
  it("accepts the four supported planned meal types", () => {
    expect(plannerPreferencesSchema.parse(validPreferences)).toEqual(
      validPreferences,
    );
  });

  it("rejects zero people, dessert, blank exclusions and duplicate meals", () => {
    expect(() =>
      plannerPreferencesSchema.parse({ ...validPreferences, people: 0 }),
    ).toThrow();
    expect(() =>
      plannerPreferencesSchema.parse({
        ...validPreferences,
        enabledMeals: ["dessert"],
      }),
    ).toThrow();
    expect(() =>
      plannerPreferencesSchema.parse({
        ...validPreferences,
        excludedIngredientIds: [""],
      }),
    ).toThrow();
    expect(() =>
      plannerPreferencesSchema.parse({
        ...validPreferences,
        enabledMeals: ["snack", "snack"],
      }),
    ).toThrow();
  });

  it("accepts only Monday week starts", () => {
    const plan = {
      id: "week-2026-10-19",
      weekStart: "2026-10-19",
      people: 2,
      generatorVersion: "v1",
      items: [
        {
          id: "2026-10-19-breakfast",
          date: "2026-10-19",
          mealType: "breakfast",
          recipeId: "recipe-breakfast-01",
          servings: 2,
          replaced: false,
        },
      ],
      notices: [],
    };

    expect(weeklyPlanSchema.parse(plan)).toEqual(plan);
    expect(() =>
      weeklyPlanSchema.parse({ ...plan, weekStart: "2026-10-20" }),
    ).toThrow();
  });

  it("validates generated and manual shopping lines", () => {
    expect(
      shoppingListItemSchema.parse({
        source: "generated",
        id: "generated:tomato:g",
        ingredientId: "tomato",
        label: "Tomate",
        quantity: 300,
        unit: "g",
        category: "produce",
        checked: false,
      }),
    ).toMatchObject({ source: "generated", ingredientId: "tomato" });

    expect(
      shoppingListItemSchema.parse({
        source: "manual",
        id: "manual:one",
        label: "Servilletas",
        category: "other",
        checked: false,
      }),
    ).toMatchObject({ source: "manual", label: "Servilletas" });

    expect(() =>
      shoppingListItemSchema.parse({
        source: "manual",
        id: "manual:bad",
        label: " ",
        quantity: 0,
        category: "other",
        checked: false,
      }),
    ).toThrow();
  });
});
