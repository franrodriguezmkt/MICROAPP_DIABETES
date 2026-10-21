declare module "virtual:recipe-content" {
  import type { Recipe } from "./domain/recipes/recipe";

  const recipes: ReadonlyArray<Recipe>;
  export default recipes;
}
