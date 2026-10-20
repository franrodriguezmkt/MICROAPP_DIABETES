import type { IngredientCatalogEntry } from "../../domain/ingredients/ingredientCatalog";
import { buildShoppingList } from "../../domain/planner/buildShoppingList";
import { generateWeeklyPlan } from "../../domain/planner/generateWeeklyPlan";
import {
  plannerPreferencesSchema,
  shoppingListItemSchema,
  type PlannerPreferences,
  type ShoppingCategory,
  type ShoppingListItem,
  type WeeklyPlan,
} from "../../domain/planner/planner";
import type { Recipe } from "../../domain/recipes/recipe";
import type { RecipeRepository } from "../../domain/recipes/recipeRepository";
import type {
  PlannerRepository,
  StoredPlannerWeek,
} from "./PlannerRepository";

export class PlannerServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PlannerServiceError";
  }
}

type PlannerServiceDependencies = {
  repository: PlannerRepository;
  recipeRepository: RecipeRepository;
  ingredientCatalog: IngredientCatalogEntry[];
  seed: string;
  includeDraftRecipes?: boolean;
  idGenerator?: () => string;
};

type Confirmation = { confirmed?: boolean };

export type ManualShoppingItemInput = {
  label: string;
  quantity?: number;
  unitLabel?: string;
  category: ShoppingCategory;
};

export type ShoppingItemPatch = {
  checked?: boolean;
  label?: string;
  quantity?: number;
  unitLabel?: string;
  category?: ShoppingCategory;
};

const defaultPreferences: PlannerPreferences = {
  people: 2,
  enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
  excludedIngredientIds: [],
};

export class PlannerService {
  private readonly idGenerator: () => string;

  constructor(private readonly dependencies: PlannerServiceDependencies) {
    this.idGenerator =
      dependencies.idGenerator ?? (() => crypto.randomUUID());
  }

  async getPreferences(userId: string) {
    return this.dependencies.repository.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    input: PlannerPreferences,
    confirmation: Confirmation = {},
  ) {
    const preferences = plannerPreferencesSchema.parse(input);
    const current = await this.dependencies.repository.getPreferences(userId);
    const weeks = await this.dependencies.repository.listWeeks(userId);
    const changed = current && JSON.stringify(current) !== JSON.stringify(preferences);

    if (changed && weeks.length > 0 && !confirmation.confirmed) {
      throw new PlannerServiceError(
        "CONFIRMATION_REQUIRED",
        "Confirma el cambio porque actualizará tu semana y tu lista de compras.",
        409,
      );
    }

    await this.dependencies.repository.savePreferences(userId, preferences);
    if (!changed || weeks.length === 0) return preferences;

    const recipes = await this.listRecipes();
    const structuralChange =
      JSON.stringify(current.enabledMeals) !==
        JSON.stringify(preferences.enabledMeals) ||
      JSON.stringify(current.excludedIngredientIds) !==
        JSON.stringify(preferences.excludedIngredientIds);

    for (const stored of weeks) {
      const plan = structuralChange
        ? generateWeeklyPlan({
            weekStart: stored.plan.weekStart,
            seed: this.seedFor(userId),
            recipes,
            preferences,
            recentRecipeIds: stored.plan.items.map((item) => item.recipeId),
          })
        : {
            ...stored.plan,
            people: preferences.people,
            items: stored.plan.items.map((item) => ({
              ...item,
              servings: preferences.people,
            })),
          };
      await this.savePlanWithShopping(userId, plan, recipes, stored.shoppingItems);
    }

    return preferences;
  }

  async getOrGenerateWeek(userId: string, weekStart: string) {
    const existing = await this.dependencies.repository.getWeek(userId, weekStart);
    if (existing) return existing.plan;

    const preferences =
      (await this.dependencies.repository.getPreferences(userId)) ??
      defaultPreferences;
    const recipes = await this.listRecipes();
    const plan = generateWeeklyPlan({
      weekStart,
      seed: this.seedFor(userId),
      recipes,
      preferences,
    });
    await this.savePlanWithShopping(userId, plan, recipes, []);
    return plan;
  }

  async regenerateWeek(
    userId: string,
    weekStart: string,
    confirmation: Confirmation,
  ) {
    const existing = await this.dependencies.repository.getWeek(userId, weekStart);
    if (existing && !confirmation.confirmed) {
      throw new PlannerServiceError(
        "CONFIRMATION_REQUIRED",
        "Confirma antes de volver a organizar la semana.",
        409,
      );
    }

    const preferences =
      (await this.dependencies.repository.getPreferences(userId)) ??
      defaultPreferences;
    const recipes = await this.listRecipes();
    const regenerationFingerprint = existing?.plan.items
      .map((item) => item.recipeId)
      .join(",");
    const plan = generateWeeklyPlan({
      weekStart,
      seed: regenerationFingerprint
        ? `${this.seedFor(userId)}:regenerate:${regenerationFingerprint}`
        : this.seedFor(userId),
      recipes,
      preferences,
      recentRecipeIds: existing?.plan.items.map((item) => item.recipeId),
    });
    await this.savePlanWithShopping(
      userId,
      plan,
      recipes,
      existing?.shoppingItems ?? [],
    );
    return plan;
  }

  async replaceItem(
    userId: string,
    weekStart: string,
    itemId: string,
    recipeId: string,
  ) {
    const stored = await this.requireWeek(userId, weekStart);
    const target = stored.plan.items.find((item) => item.id === itemId);
    if (!target) {
      throw new PlannerServiceError(
        "ITEM_NOT_FOUND",
        "No encontramos esa comida en la semana.",
        404,
      );
    }

    const preferences =
      (await this.dependencies.repository.getPreferences(userId)) ??
      defaultPreferences;
    const recipe = await this.dependencies.recipeRepository.getById(recipeId, {
      includeDrafts: this.dependencies.includeDraftRecipes,
    });
    const excluded = new Set(preferences.excludedIngredientIds);
    if (
      !recipe ||
      recipe.category !== target.mealType ||
      recipe.ingredients.some((ingredient) => excluded.has(ingredient.ingredientId))
    ) {
      throw new PlannerServiceError(
        "INVALID_REPLACEMENT",
        "Esa receta no es compatible con esta comida y tus preferencias.",
        422,
      );
    }

    const plan: WeeklyPlan = {
      ...stored.plan,
      items: stored.plan.items.map((item) =>
        item.id === itemId
          ? { ...item, recipeId: recipe.id, replaced: true }
          : item,
      ),
    };
    const recipes = await this.listRecipes();
    await this.savePlanWithShopping(userId, plan, recipes, stored.shoppingItems);
    return plan;
  }

  async getShoppingList(userId: string, weekStart: string) {
    const stored = await this.dependencies.repository.getWeek(userId, weekStart);
    return stored?.shoppingItems ?? [];
  }

  async patchShoppingItem(
    userId: string,
    weekStart: string,
    itemId: string,
    patch: ShoppingItemPatch,
  ) {
    const stored = await this.requireWeek(userId, weekStart);
    const index = stored.shoppingItems.findIndex((item) => item.id === itemId);
    if (index < 0) {
      throw new PlannerServiceError(
        "ITEM_NOT_FOUND",
        "No encontramos ese elemento de compras.",
        404,
      );
    }

    const current = stored.shoppingItems[index]!;
    const next =
      current.source === "generated"
        ? shoppingListItemSchema.parse({
            ...current,
            checked: patch.checked ?? current.checked,
          })
        : shoppingListItemSchema.parse({ ...current, ...patch });
    stored.shoppingItems[index] = next;
    await this.dependencies.repository.saveWeek(userId, stored);
    return next;
  }

  async addManualShoppingItem(
    userId: string,
    weekStart: string,
    input: ManualShoppingItemInput,
  ) {
    const stored = await this.requireWeek(userId, weekStart);
    const item = shoppingListItemSchema.parse({
      source: "manual",
      id: `manual:${this.idGenerator()}`,
      checked: false,
      ...input,
    });
    stored.shoppingItems.push(item);
    await this.dependencies.repository.saveWeek(userId, stored);
    return item;
  }

  async deleteManualShoppingItem(
    userId: string,
    weekStart: string,
    itemId: string,
  ) {
    const stored = await this.requireWeek(userId, weekStart);
    const item = stored.shoppingItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      throw new PlannerServiceError(
        "ITEM_NOT_FOUND",
        "No encontramos ese elemento de compras.",
        404,
      );
    }
    if (item.source !== "manual") {
      throw new PlannerServiceError(
        "GENERATED_ITEM_READ_ONLY",
        "Los ingredientes de las recetas no se pueden eliminar.",
        422,
      );
    }
    stored.shoppingItems = stored.shoppingItems.filter(
      (candidate) => candidate.id !== itemId,
    );
    await this.dependencies.repository.saveWeek(userId, stored);
  }

  private seedFor(userId: string) {
    return `${this.dependencies.seed}:${userId}`;
  }

  private listRecipes(): Promise<Recipe[]> {
    return this.dependencies.recipeRepository.list({
      includeDrafts: this.dependencies.includeDraftRecipes,
    });
  }

  private async requireWeek(userId: string, weekStart: string) {
    const stored = await this.dependencies.repository.getWeek(userId, weekStart);
    if (!stored) {
      throw new PlannerServiceError(
        "WEEK_NOT_FOUND",
        "Primero organiza esta semana.",
        404,
      );
    }
    return stored;
  }

  private async savePlanWithShopping(
    userId: string,
    plan: WeeklyPlan,
    recipes: Recipe[],
    previousItems: ShoppingListItem[],
  ) {
    const stored: StoredPlannerWeek = {
      plan,
      shoppingItems: buildShoppingList({
        plan,
        recipes,
        ingredientCatalog: this.dependencies.ingredientCatalog,
        previousItems,
      }),
    };
    await this.dependencies.repository.saveWeek(userId, stored);
  }
}
