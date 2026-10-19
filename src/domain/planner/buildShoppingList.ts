import type { IngredientCatalogEntry } from "../ingredients/ingredientCatalog";
import type { IngredientUnit, Recipe } from "../recipes/recipe";
import {
  shoppingListSchema,
  type ShoppingListItem,
  type WeeklyPlan,
} from "./planner";

type GeneratedShoppingListItem = Extract<
  ShoppingListItem,
  { source: "generated" }
>;

export type BuildShoppingListInput = {
  plan: WeeklyPlan;
  recipes: Recipe[];
  ingredientCatalog: IngredientCatalogEntry[];
  previousItems?: ShoppingListItem[];
};

const categoryOrder = [
  "produce",
  "protein",
  "dairy",
  "bakery",
  "pantry",
  "frozen",
  "other",
] as const;

export function shoppingLineKey(
  ingredientId: string,
  unit: IngredientUnit,
) {
  return `generated:${ingredientId}:${unit}`;
}

export function formatShoppingQuantity(quantity: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(quantity);
}

export function buildShoppingList({
  plan,
  recipes,
  ingredientCatalog,
  previousItems = [],
}: BuildShoppingListInput): ShoppingListItem[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const catalogById = new Map(
    ingredientCatalog.map((ingredient) => [
      ingredient.ingredientId,
      ingredient,
    ]),
  );
  const priorChecked = new Map(
    previousItems
      .filter((item) => item.source === "generated")
      .map((item) => [item.id, item.checked]),
  );
  const generated = new Map<string, GeneratedShoppingListItem>();

  for (const planItem of plan.items) {
    const recipe = recipesById.get(planItem.recipeId);
    if (!recipe) continue;
    const scale = planItem.servings / recipe.servingsBase;

    for (const ingredient of recipe.ingredients) {
      const catalogEntry = catalogById.get(ingredient.ingredientId);
      if (!catalogEntry) {
        throw new Error(
          `El ingrediente ${ingredient.ingredientId} no existe en el catálogo.`,
        );
      }

      const id = shoppingLineKey(ingredient.ingredientId, ingredient.unit);
      const prior = generated.get(id);
      const scaledQuantity =
        ingredient.quantity === null ? null : ingredient.quantity * scale;

      if (prior) {
        if (prior.quantity !== null && scaledQuantity !== null) {
          prior.quantity += scaledQuantity;
        }
        continue;
      }

      generated.set(id, {
        source: "generated",
        id,
        ingredientId: ingredient.ingredientId,
        label: catalogEntry.label,
        quantity: scaledQuantity,
        unit: ingredient.unit,
        category: catalogEntry.category,
        checked: priorChecked.get(id) ?? false,
      });
    }
  }

  const generatedItems = [...generated.values()].sort((left, right) => {
    const categoryDifference =
      categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
    if (categoryDifference !== 0) return categoryDifference;
    const labelDifference = left.label.localeCompare(right.label, "es");
    if (labelDifference !== 0) return labelDifference;
    return left.unit.localeCompare(right.unit);
  });
  const manualItems = previousItems
    .filter((item) => item.source === "manual")
    .map((item) => ({ ...item }));

  return shoppingListSchema.parse([...generatedItems, ...manualItems]);
}
