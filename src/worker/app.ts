import { Hono } from "hono";

import { PlannerService } from "../application/planner/PlannerService";
import type { PlannerRepository } from "../application/planner/PlannerRepository";
import type { IngredientCatalogEntry } from "../domain/ingredients/ingredientCatalog";
import type { Recipe } from "../domain/recipes/recipe";
import { createJsonRecipeRepository } from "../infrastructure/recipes/jsonRecipeRepository";
import { createPlannerRoutes } from "./plannerRoutes";

export type WorkerAppDependencies = {
  plannerPreview?: boolean;
  repository?: PlannerRepository;
  recipes?: ReadonlyArray<Recipe>;
  ingredientCatalog?: IngredientCatalogEntry[];
  previewUserId?: string;
  idGenerator?: () => string;
};

export function createWorkerApp(
  dependencies: WorkerAppDependencies = {},
): Hono<WorkerBindings> {
  const app = new Hono<WorkerBindings>();

  app.get("/api/health", (context) =>
    context.json({ ok: true, service: "recipe-app" }),
  );

  const plannerService =
    dependencies.plannerPreview &&
    dependencies.repository &&
    dependencies.recipes &&
    dependencies.ingredientCatalog
      ? new PlannerService({
          repository: dependencies.repository,
          recipeRepository: createJsonRecipeRepository(dependencies.recipes, {
            contentPreview: true,
          }),
          ingredientCatalog: dependencies.ingredientCatalog,
          includeDraftRecipes: true,
          seed: "planner-preview",
          idGenerator: dependencies.idGenerator,
        })
      : undefined;

  app.route(
    "/",
    createPlannerRoutes({
      plannerPreview: dependencies.plannerPreview ?? false,
      plannerService,
      previewUserId: dependencies.previewUserId,
    }),
  );

  return app;
}
