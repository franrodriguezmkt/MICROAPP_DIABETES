import { z } from "zod";

import {
  shoppingCategorySchema,
  type ShoppingCategory,
} from "../ingredients/ingredientCatalog";
import { ingredientUnits, type IngredientUnit } from "../recipes/recipe";

export const plannedMealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "La fecha no es válida.",
  });

const mondayDateSchema = isoDateSchema.refine(
  (value) => new Date(`${value}T00:00:00Z`).getUTCDay() === 1,
  { message: "La semana debe comenzar un lunes." },
);

const uniqueStrings = <T extends z.ZodType<string>>(itemSchema: T) =>
  z.array(itemSchema).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: "Los valores no pueden repetirse.",
      });
    }
  });

export const plannedMealTypeSchema = z.enum(plannedMealTypes);

export const plannerPreferencesSchema = z.object({
  people: z.number().int().min(1).max(12),
  enabledMeals: uniqueStrings(plannedMealTypeSchema).pipe(
    z.array(plannedMealTypeSchema).min(1),
  ),
  excludedIngredientIds: uniqueStrings(identifierSchema),
});

export const weeklyPlanItemSchema = z.object({
  id: z.string().trim().min(1),
  date: isoDateSchema,
  mealType: plannedMealTypeSchema,
  recipeId: identifierSchema,
  servings: z.number().int().min(1).max(12),
  replaced: z.boolean(),
});

export const weeklyPlanSchema = z.object({
  id: z.string().trim().min(1),
  weekStart: mondayDateSchema,
  people: z.number().int().min(1).max(12),
  generatorVersion: z.string().trim().min(1),
  items: z.array(weeklyPlanItemSchema),
  notices: z.array(z.string().trim().min(1)),
});

const shoppingItemBaseSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  category: shoppingCategorySchema,
  checked: z.boolean(),
});

const generatedShoppingListItemSchema = shoppingItemBaseSchema
  .extend({
    source: z.literal("generated"),
    ingredientId: identifierSchema,
    quantity: z.number().positive().nullable(),
    unit: z.enum(ingredientUnits),
  })
  .superRefine((item, context) => {
    const isToTaste = item.unit === "to_taste";
    if (isToTaste !== (item.quantity === null)) {
      context.addIssue({
        code: "custom",
        message: "La cantidad y la unidad deben ser compatibles.",
        path: ["quantity"],
      });
    }
  });

const manualShoppingListItemSchema = shoppingItemBaseSchema.extend({
  source: z.literal("manual"),
  quantity: z.number().positive().optional(),
  unitLabel: z.string().trim().min(1).optional(),
});

export const shoppingListItemSchema = z.discriminatedUnion("source", [
  generatedShoppingListItemSchema,
  manualShoppingListItemSchema,
]);

export const shoppingListSchema = z.array(shoppingListItemSchema);

export type PlannedMealType = (typeof plannedMealTypes)[number];
export type PlannerPreferences = z.infer<typeof plannerPreferencesSchema>;
export type WeeklyPlanItem = z.infer<typeof weeklyPlanItemSchema>;
export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>;
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;
export type { IngredientUnit, ShoppingCategory };
