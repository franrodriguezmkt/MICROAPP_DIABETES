declare module "virtual:recipe-content" {
  import type { Recipe } from "./domain/recipes/recipe";

  const recipes: Recipe[];
  export default recipes;
}
