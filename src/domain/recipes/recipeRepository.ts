import type { Recipe, RecipeCategory } from "./recipe";

export type RecipeQuery = {
  category?: RecipeCategory;
  search?: string;
  excludedIngredientIds?: string[];
  includeDrafts?: boolean;
};

export interface RecipeRepository {
  list(query?: RecipeQuery): Promise<Recipe[]>;
  getBySlug(
    slug: string,
    options?: { includeDrafts?: boolean },
  ): Promise<Recipe | null>;
}
