import { beforeEach, describe, expect, it } from "vitest";

import { PlannerService } from "../../src/application/planner/PlannerService";
import type { IngredientCatalogEntry } from "../../src/domain/ingredients/ingredientCatalog";
import type { PlannerPreferences } from "../../src/domain/planner/planner";
import type { Recipe, RecipeCategory } from "../../src/domain/recipes/recipe";
import { InMemoryPlannerRepository } from "../../src/infrastructure/planner/InMemoryPlannerRepository";
import { createJsonRecipeRepository } from "../../src/infrastructure/recipes/jsonRecipeRepository";

function makeRecipe(
  id: string,
  category: RecipeCategory,
  ingredientId: string,
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
        quantity: 100,
        unit: "g",
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
    Array.from({ length: 3 }, (_, index) =>
      makeRecipe(
        `${category}-${index + 1}`,
        category,
        `${category}-ingredient-${index + 1}`,
      ),
    ),
);

const ingredientCatalog: IngredientCatalogEntry[] = recipes.map((recipe) => ({
  ingredientId: recipe.ingredients[0]!.ingredientId,
  label: recipe.ingredients[0]!.displayName,
  category: "produce",
}));

const preferences: PlannerPreferences = {
  people: 2,
  enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
  excludedIngredientIds: [],
};

describe("PlannerService", () => {
  let repository: InMemoryPlannerRepository;
  let service: PlannerService;

  beforeEach(() => {
    repository = new InMemoryPlannerRepository();
    service = new PlannerService({
      repository,
      recipeRepository: createJsonRecipeRepository(recipes, {
        contentPreview: false,
      }),
      ingredientCatalog,
      seed: "preview-seed",
      idGenerator: () => "manual-test-id",
    });
  });

  it("generates on first read and returns the same stored week on repeat reads", async () => {
    await service.updatePreferences("preview-user", preferences);

    const first = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );
    first.items[0]!.recipeId = "mutated-by-caller";
    const second = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );

    expect(second.items).toHaveLength(28);
    expect(second.items[0]!.recipeId).not.toBe("mutated-by-caller");
    await expect(
      repository.getWeek("preview-user", "2026-10-19"),
    ).resolves.toMatchObject({ plan: second });
  });

  it("requires confirmation to regenerate an existing week", async () => {
    await service.updatePreferences("preview-user", preferences);
    const first = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );

    await expect(
      service.regenerateWeek("preview-user", "2026-10-19", {
        confirmed: false,
      }),
    ).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });

    const regenerated = await service.regenerateWeek(
      "preview-user",
      "2026-10-19",
      { confirmed: true },
    );
    expect(regenerated.items.map((item) => item.recipeId)).not.toEqual(
      first.items.map((item) => item.recipeId),
    );
  });

  it("requires confirmation for a people change and recalculates shopping", async () => {
    await service.updatePreferences("preview-user", preferences);
    await service.getOrGenerateWeek("preview-user", "2026-10-19");
    const before = await service.getShoppingList(
      "preview-user",
      "2026-10-19",
    );

    await expect(
      service.updatePreferences(
        "preview-user",
        { ...preferences, people: 3 },
        { confirmed: false },
      ),
    ).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });

    await service.updatePreferences(
      "preview-user",
      { ...preferences, people: 3 },
      { confirmed: true },
    );
    const week = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );
    const after = await service.getShoppingList(
      "preview-user",
      "2026-10-19",
    );

    expect(week.items.every((item) => item.servings === 3)).toBe(true);
    expect((after[0]?.quantity ?? 0) / (before[0]?.quantity ?? 1)).toBeCloseTo(
      1.5,
    );
  });

  it("replaces only one compatible item and retains checks and manual lines", async () => {
    await service.updatePreferences("preview-user", preferences);
    const week = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );
    const target = week.items.find((item) => item.mealType === "breakfast")!;
    const replacement = recipes.find(
      (recipe) =>
        recipe.category === "breakfast" && recipe.id !== target.recipeId,
    )!;
    const initialShopping = await service.getShoppingList(
      "preview-user",
      "2026-10-19",
    );
    await service.patchShoppingItem(
      "preview-user",
      "2026-10-19",
      initialShopping[0]!.id,
      { checked: true },
    );
    const manual = await service.addManualShoppingItem(
      "preview-user",
      "2026-10-19",
      { label: "Servilletas", category: "other" },
    );

    const replaced = await service.replaceItem(
      "preview-user",
      "2026-10-19",
      target.id,
      replacement.id,
    );
    const changedItems = replaced.items.filter(
      (item, index) => item.recipeId !== week.items[index]!.recipeId,
    );
    const shopping = await service.getShoppingList(
      "preview-user",
      "2026-10-19",
    );

    expect(changedItems).toEqual([
      expect.objectContaining({ id: target.id, replaced: true }),
    ]);
    expect(shopping).toContainEqual(manual);
    expect(
      shopping.find((item) => item.id === initialShopping[0]!.id)?.checked,
    ).toBe(true);
  });

  it("rejects a replacement from the wrong meal category", async () => {
    await service.updatePreferences("preview-user", preferences);
    const week = await service.getOrGenerateWeek(
      "preview-user",
      "2026-10-19",
    );
    const target = week.items.find((item) => item.mealType === "breakfast")!;
    const lunch = recipes.find((recipe) => recipe.category === "lunch")!;

    await expect(
      service.replaceItem(
        "preview-user",
        "2026-10-19",
        target.id,
        lunch.id,
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPLACEMENT" });
  });
});
