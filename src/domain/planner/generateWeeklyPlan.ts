import type { Recipe } from "../recipes/recipe";
import {
  plannedMealTypes,
  plannerPreferencesSchema,
  weeklyPlanSchema,
  type PlannedMealType,
  type PlannerPreferences,
  type WeeklyPlan,
} from "./planner";

export const GENERATOR_VERSION = "planner-v1";

export type GenerateWeeklyPlanInput = {
  weekStart: string;
  seed: string;
  recipes: Recipe[];
  preferences: PlannerPreferences;
  recentRecipeIds?: string[];
};

const mealLabels: Record<PlannedMealType, string> = {
  breakfast: "desayunos",
  lunch: "almuerzos",
  dinner: "cenas",
  snack: "colaciones",
};

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function addUtcDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compareNumbers(left: number[], right: number[]) {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export function generateWeeklyPlan(
  input: GenerateWeeklyPlanInput,
): WeeklyPlan {
  const preferences = plannerPreferencesSchema.parse(input.preferences);
  const excluded = new Set(preferences.excludedIngredientIds);
  const recent = new Set(input.recentRecipeIds ?? []);
  const enabled = new Set(preferences.enabledMeals);
  const mealOrder = plannedMealTypes.filter((meal) => enabled.has(meal));
  const notices: string[] = [];
  const candidates = new Map<PlannedMealType, Recipe[]>();

  for (const mealType of mealOrder) {
    const compatible = input.recipes.filter(
      (recipe) =>
        recipe.category === mealType &&
        recipe.ingredients.every(
          (ingredient) => !excluded.has(ingredient.ingredientId),
        ),
    );
    candidates.set(mealType, compatible);

    if (compatible.length === 0) {
      notices.push(
        `No encontramos recetas compatibles para ${mealLabels[mealType]} con las preferencias actuales.`,
      );
    } else if (compatible.length < 7) {
      notices.push(
        `Solo encontramos ${compatible.length} opciones de ${mealLabels[mealType]}; algunas se repiten para completar la semana.`,
      );
    }
  }

  const usage = new Map<string, number>();
  const lastSlot = new Map<string, number>();
  const items: WeeklyPlan["items"] = [];
  let slotIndex = 0;

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addUtcDays(input.weekStart, dayIndex);
    const dailyPrimaryIngredients = new Set<string>();

    for (const mealType of mealOrder) {
      const compatible = candidates.get(mealType) ?? [];
      if (compatible.length === 0) continue;

      const ranked = compatible
        .map((recipe) => {
          const usedCount = usage.get(recipe.id) ?? 0;
          const priorSlot = lastSlot.get(recipe.id);
          const distance = priorSlot === undefined ? Number.MAX_SAFE_INTEGER : slotIndex - priorSlot;
          const primaryIngredient = recipe.ingredients[0]?.ingredientId;
          const score = [
            usedCount,
            recent.has(recipe.id) ? 1 : 0,
            primaryIngredient && dailyPrimaryIngredients.has(primaryIngredient)
              ? 1
              : 0,
            -distance,
            stableHash(
              `${input.seed}:${input.weekStart}:${GENERATOR_VERSION}:${date}:${mealType}:${recipe.id}`,
            ),
          ];
          return { recipe, score, primaryIngredient };
        })
        .sort((left, right) => compareNumbers(left.score, right.score));

      const selected = ranked[0]!;
      usage.set(selected.recipe.id, (usage.get(selected.recipe.id) ?? 0) + 1);
      lastSlot.set(selected.recipe.id, slotIndex);
      if (selected.primaryIngredient) {
        dailyPrimaryIngredients.add(selected.primaryIngredient);
      }

      items.push({
        id: `${input.weekStart}:${date}:${mealType}`,
        date,
        mealType,
        recipeId: selected.recipe.id,
        servings: preferences.people,
        replaced: false,
      });
      slotIndex += 1;
    }
  }

  const planFingerprint = JSON.stringify({
    seed: input.seed,
    weekStart: input.weekStart,
    generatorVersion: GENERATOR_VERSION,
    preferences,
  });

  return weeklyPlanSchema.parse({
    id: `week:${input.weekStart}:${stableHash(planFingerprint).toString(36)}`,
    weekStart: input.weekStart,
    people: preferences.people,
    generatorVersion: GENERATOR_VERSION,
    items,
    notices,
  });
}
