import { Hono } from "hono";

import type { AccessGateway } from "../application/access/AccessGateway";
import { PlannerService } from "../application/planner/PlannerService";
import type { PlannerRepository } from "../application/planner/PlannerRepository";
import type { IngredientCatalogEntry } from "../domain/ingredients/ingredientCatalog";
import type { Recipe } from "../domain/recipes/recipe";
import { createJsonRecipeRepository } from "../infrastructure/recipes/jsonRecipeRepository";
import { createPlannerRoutes } from "./plannerRoutes";
import { createAuthMiddleware, type WorkerEnv } from "./authMiddleware";

export type WorkerAppDependencies = {
  plannerPreview?: boolean;
  repository?: PlannerRepository;
  recipes?: ReadonlyArray<Recipe>;
  ingredientCatalog?: IngredientCatalogEntry[];
  previewUserId?: string;
  idGenerator?: () => string;
  accessGateway?: AccessGateway;
};

export function createWorkerApp(
  dependencies: WorkerAppDependencies = {},
): Hono<WorkerEnv> {
  const app = new Hono<WorkerEnv>();

  app.get("/api/health", (context) =>
    context.json({ ok: true, service: "recipe-app" }),
  );

  if (dependencies.accessGateway) {
    app.use(
      "/api/private/*",
      createAuthMiddleware({ gateway: dependencies.accessGateway }),
    );
  }

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
