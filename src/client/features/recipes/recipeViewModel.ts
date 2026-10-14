import type { IngredientUnit } from "../../../domain/recipes/recipe";

const singularUnits: Record<IngredientUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  unit: "unidad",
  tbsp: "cucharada",
  tsp: "cucharadita",
  cup: "taza",
  pinch: "pizca",
  to_taste: "al gusto",
};

const pluralUnits: Record<IngredientUnit, string> = {
  ...singularUnits,
  unit: "unidades",
  tbsp: "cucharadas",
  tsp: "cucharaditas",
  cup: "tazas",
  pinch: "pizcas",
};

export function formatIngredientQuantity(
  quantity: number | null,
  unit: IngredientUnit,
): string {
  if (quantity === null || unit === "to_taste") {
    return "al gusto";
  }

  const formattedQuantity = new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(quantity);
  const unitLabel = quantity <= 1 ? singularUnits[unit] : pluralUnits[unit];

  return `${formattedQuantity} ${unitLabel}`;
}
