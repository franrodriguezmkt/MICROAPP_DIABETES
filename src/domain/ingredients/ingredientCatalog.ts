import { z } from "zod";

export const shoppingCategories = [
  "produce",
  "protein",
  "dairy",
  "pantry",
  "bakery",
  "frozen",
  "other",
] as const;

export const shoppingCategorySchema = z.enum(shoppingCategories);

export const ingredientCatalogEntrySchema = z.object({
  ingredientId: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(2),
  category: shoppingCategorySchema,
});

export const ingredientCatalogSchema = z
  .array(ingredientCatalogEntrySchema)
  .superRefine((entries, context) => {
    const seen = new Set<string>();

    entries.forEach((entry, index) => {
      if (seen.has(entry.ingredientId)) {
        context.addIssue({
          code: "custom",
          message: "Cada ingrediente debe aparecer una sola vez.",
          path: [index, "ingredientId"],
        });
      }
      seen.add(entry.ingredientId);
    });
  });

export type ShoppingCategory = (typeof shoppingCategories)[number];
export type IngredientCatalogEntry = z.infer<
  typeof ingredientCatalogEntrySchema
>;
