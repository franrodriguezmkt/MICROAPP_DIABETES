import { z } from "zod";

export const recipeCategories = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
] as const;

export const publicationStatuses = [
  "draft",
  "editorial_review",
  "professional_review",
  "approved",
] as const;

export const ingredientUnits = [
  "g",
  "kg",
  "ml",
  "l",
  "unit",
  "tbsp",
  "tsp",
  "cup",
  "pinch",
  "to_taste",
] as const;

const measuredIngredientUnits = ingredientUnits.filter(
  (unit): unit is Exclude<IngredientUnit, "to_taste"> => unit !== "to_taste",
);

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const ingredientBaseSchema = z.object({
  ingredientId: identifierSchema,
  displayName: z.string().trim().min(1),
  preparationNote: z.string().trim().min(1).nullable(),
});

export const recipeIngredientSchema = z.union([
  ingredientBaseSchema.extend({
    quantity: z.number().positive(),
    unit: z.enum(measuredIngredientUnits),
  }),
  ingredientBaseSchema.extend({
    quantity: z.null(),
    unit: z.literal("to_taste"),
  }),
]);

export const recipeSchema = z.object({
  id: identifierSchema,
  slug: identifierSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  category: z.enum(recipeCategories),
  servingsBase: z.number().int().min(1).max(12),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  imagePath: z
    .string()
    .regex(/^\/recipes\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:avif|webp)$/)
    .optional(),
  ingredients: z.array(recipeIngredientSchema).min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  tags: z.array(z.string().trim().min(1)),
  allergens: z.array(z.string().trim().min(1)),
  publicationStatus: z.enum(publicationStatuses),
  source: z
    .object({
      fileName: z.string().trim().min(1),
      pageStart: z.number().int().positive(),
      pageEnd: z.number().int().positive(),
    })
    .refine(({ pageStart, pageEnd }) => pageEnd >= pageStart, {
      message: "La página final no puede ser anterior a la inicial.",
      path: ["pageEnd"],
    }),
});

export const recipeCollectionSchema = z
  .array(recipeSchema)
  .superRefine((recipes, context) => {
    for (const key of ["id", "slug"] as const) {
      const seen = new Set<string>();
      recipes.forEach((recipe, index) => {
        if (seen.has(recipe[key])) {
          context.addIssue({
            code: "custom",
            message: `El ${key} debe ser único.`,
            path: [index, key],
          });
        }
        seen.add(recipe[key]);
      });
    }
  });

export type RecipeCategory = (typeof recipeCategories)[number];
export type PublicationStatus = (typeof publicationStatuses)[number];
export type IngredientUnit = (typeof ingredientUnits)[number];
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
