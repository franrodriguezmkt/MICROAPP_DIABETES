import type { RecipeIngredient } from "./recipe";

export type ScaledIngredient = RecipeIngredient;

function assertServingCount(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new RangeError(`${label} debe ser un entero entre 1 y 12.`);
  }
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  fromServings: number,
  toServings: number,
): ScaledIngredient {
  assertServingCount(fromServings, "La porción base");
  assertServingCount(toServings, "La nueva porción");

  if (ingredient.quantity === null) {
    return { ...ingredient };
  }

  const quantity = Math.round(
    ingredient.quantity * (toServings / fromServings) * 10_000,
  ) / 10_000;

  return { ...ingredient, quantity };
}
