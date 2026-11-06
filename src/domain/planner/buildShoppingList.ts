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

type QuantityDimension =
  | "mass"
  | "metric-volume"
  | "culinary-volume"
  | "count"
  | "taste";

type MeasuredAggregate = {
  groupId: string;
  label: string;
  category: IngredientCatalogEntry["category"];
  dimension: Exclude<QuantityDimension, "taste">;
  baseQuantity: number;
  sourceUnits: Set<IngredientUnit>;
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

const unitDefinition: Record<
  IngredientUnit,
  { dimension: QuantityDimension; factor: number }
> = {
  g: { dimension: "mass", factor: 1 },
  kg: { dimension: "mass", factor: 1_000 },
  ml: { dimension: "metric-volume", factor: 1 },
  l: { dimension: "metric-volume", factor: 1_000 },
  unit: { dimension: "count", factor: 1 },
  cup: { dimension: "culinary-volume", factor: 48 },
  tbsp: { dimension: "culinary-volume", factor: 3 },
  tsp: { dimension: "culinary-volume", factor: 1 },
  pinch: { dimension: "culinary-volume", factor: 1 / 16 },
  to_taste: { dimension: "taste", factor: 1 },
};

function canonicalIdentity(entry: IngredientCatalogEntry) {
  return {
    groupId: entry.shoppingGroupId ?? entry.ingredientId,
    label: entry.shoppingLabel ?? entry.label,
  };
}

function quantityDimension(unit: IngredientUnit) {
  return unitDefinition[unit].dimension;
}

export function shoppingLineKey(ingredientId: string, unit: IngredientUnit) {
  return `generated:${ingredientId}:${quantityDimension(unit)}`;
}

export function formatShoppingQuantity(quantity: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(quantity);
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function displayUnit(aggregate: MeasuredAggregate): IngredientUnit {
  if (aggregate.dimension === "mass") {
    return aggregate.sourceUnits.has("kg") ? "kg" : "g";
  }
  if (aggregate.dimension === "metric-volume") {
    return aggregate.sourceUnits.has("l") ? "l" : "ml";
  }
  if (aggregate.dimension === "count") return "unit";
  if (aggregate.sourceUnits.has("cup")) return "cup";
  if (aggregate.sourceUnits.has("tbsp")) return "tbsp";
  if (aggregate.sourceUnits.has("tsp")) return "tsp";
  return "pinch";
}

function displayQuantity(aggregate: MeasuredAggregate, unit: IngredientUnit) {
  return roundQuantity(aggregate.baseQuantity / unitDefinition[unit].factor);
}

function priorCandidates(
  previousItems: ShoppingListItem[],
  generatedId: string,
  groupId: string,
  dimension: QuantityDimension,
  catalogById: Map<string, IngredientCatalogEntry>,
) {
  const exact = previousItems.find(
    (item): item is GeneratedShoppingListItem =>
      item.source === "generated" && item.id === generatedId,
  );
  if (exact) return { exact, all: [exact] };

  const all = previousItems.filter(
    (item): item is GeneratedShoppingListItem => {
      if (item.source !== "generated") return false;
      const entry = catalogById.get(item.ingredientId);
      return Boolean(
        entry &&
          canonicalIdentity(entry).groupId === groupId &&
          quantityDimension(item.unit) === dimension,
      );
    },
  );
  return { exact: undefined, all };
}

export function buildShoppingList({
  plan,
  recipes,
  ingredientCatalog,
  previousItems = [],
}: BuildShoppingListInput): ShoppingListItem[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const catalogById = new Map(
    ingredientCatalog.map((ingredient) => [ingredient.ingredientId, ingredient]),
  );
  const measured = new Map<string, MeasuredAggregate>();
  const tasteGroups = new Map<
    string,
    { groupId: string; label: string; category: IngredientCatalogEntry["category"] }
  >();

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
      const identity = canonicalIdentity(catalogEntry);
      const definition = unitDefinition[ingredient.unit];
      if (definition.dimension === "taste") {
        tasteGroups.set(identity.groupId, {
          ...identity,
          category: catalogEntry.category,
        });
        continue;
      }

      const key = `${identity.groupId}:${definition.dimension}`;
      const current = measured.get(key) ?? {
        ...identity,
        category: catalogEntry.category,
        dimension: definition.dimension,
        baseQuantity: 0,
        sourceUnits: new Set<IngredientUnit>(),
      };
      current.baseQuantity +=
        (ingredient.quantity ?? 0) * scale * definition.factor;
      current.sourceUnits.add(ingredient.unit);
      measured.set(key, current);
    }
  }

  const generated: GeneratedShoppingListItem[] = [];
  const measuredByGroup = new Map<string, GeneratedShoppingListItem[]>();
  for (const aggregate of measured.values()) {
    const id = `generated:${aggregate.groupId}:${aggregate.dimension}`;
    const unit = displayUnit(aggregate);
    const previous = priorCandidates(
      previousItems,
      id,
      aggregate.groupId,
      aggregate.dimension,
      catalogById,
    );
    const computed: GeneratedShoppingListItem = {
      source: "generated",
      id,
      ingredientId: aggregate.groupId,
      label: aggregate.label,
      quantity: displayQuantity(aggregate, unit),
      unit,
      category: aggregate.category,
      checked:
        previous.all.length > 0 && previous.all.every((item) => item.checked),
      customized: false,
      hidden: previous.exact?.hidden ?? false,
      includesToTaste: false,
    };
    const item = previous.exact?.customized
      ? {
          ...computed,
          label: previous.exact.label,
          quantity: previous.exact.quantity,
          unit: previous.exact.unit,
          category: previous.exact.category,
          customized: true,
        }
      : computed;
    generated.push(item);
    const groupItems = measuredByGroup.get(aggregate.groupId) ?? [];
    groupItems.push(item);
    measuredByGroup.set(aggregate.groupId, groupItems);
  }

  for (const taste of tasteGroups.values()) {
    const measuredItems = measuredByGroup.get(taste.groupId);
    if (measuredItems?.length) {
      measuredItems[0]!.includesToTaste = true;
      continue;
    }
    const id = `generated:${taste.groupId}:taste`;
    const previous = priorCandidates(
      previousItems,
      id,
      taste.groupId,
      "taste",
      catalogById,
    );
    generated.push({
      source: "generated",
      id,
      ingredientId: taste.groupId,
      label: previous.exact?.customized ? previous.exact.label : taste.label,
      quantity: null,
      unit: "to_taste",
      category: previous.exact?.customized
        ? previous.exact.category
        : taste.category,
      checked:
        previous.all.length > 0 && previous.all.every((item) => item.checked),
      customized: previous.exact?.customized ?? false,
      hidden: previous.exact?.hidden ?? false,
      includesToTaste: false,
    });
  }

  generated.sort((left, right) => {
    const categoryDifference =
      categoryOrder.indexOf(left.category) -
      categoryOrder.indexOf(right.category);
    if (categoryDifference !== 0) return categoryDifference;
    const labelDifference = left.label.localeCompare(right.label, "es");
    if (labelDifference !== 0) return labelDifference;
    return left.id.localeCompare(right.id);
  });
  const manualItems = previousItems
    .filter((item) => item.source === "manual")
    .map((item) => ({ ...item }));

  return shoppingListSchema.parse([...generated, ...manualItems]);
}
