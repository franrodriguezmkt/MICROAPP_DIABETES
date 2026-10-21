import { Hono } from "hono";

import type {
  AccessGateway,
  AccessRequestGateway,
} from "../application/access/AccessGateway";
import { PlannerService } from "../application/planner/PlannerService";
import type { PlannerRepository } from "../application/planner/PlannerRepository";
import type { IngredientCatalogEntry } from "../domain/ingredients/ingredientCatalog";
import type { Recipe } from "../domain/recipes/recipe";
import { createJsonRecipeRepository } from "../infrastructure/recipes/jsonRecipeRepository";
import { SupabasePlannerRepository } from "../infrastructure/planner/SupabasePlannerRepository";
import { createSupabaseAccessGateway } from "../infrastructure/supabase/createSupabaseClients";
import { createPlannerRoutes } from "./plannerRoutes";
import { createAuthMiddleware, type WorkerEnv } from "./authMiddleware";
import { createAccessRoutes, type AccessAuditEntry } from "./accessRoutes";
import type { HotmartEventGateway } from "../application/access/HotmartEntitlementService";
import { createHotmartRoutes, type HotmartAuditEntry } from "./hotmartRoutes";

export type WorkerAppDependencies = {
  plannerPreview?: boolean;
  repository?: PlannerRepository;
  recipes?: ReadonlyArray<Recipe>;
  ingredientCatalog?: IngredientCatalogEntry[];
  previewUserId?: string;
  idGenerator?: () => string;
  accessGateway?: AccessGateway;
  accessRequestGateway?: AccessRequestGateway;
  accessRateLimitPepper?: string;
  accessAudit?: (entry: AccessAuditEntry) => void;
  hotmartEventGateway?: HotmartEventGateway;
  hotmartHottok?: string;
  hotmartProductUcode?: string;
  hotmartAudit?: (entry: HotmartAuditEntry) => void;
};

export function createWorkerApp(
  dependencies: WorkerAppDependencies = {},
): Hono<WorkerEnv> {
  const app = new Hono<WorkerEnv>();

  app.get("/api/health", (context) =>
    context.json({ ok: true, service: "recipe-app" }),
  );

  app.route(
    "/",
    createAccessRoutes({
      gateway: dependencies.accessRequestGateway,
      rateLimitPepper: dependencies.accessRateLimitPepper,
      audit: dependencies.accessAudit,
    }),
  );

  app.route(
    "/",
    createHotmartRoutes({
      gateway: dependencies.hotmartEventGateway,
      hottok: dependencies.hotmartHottok,
      productUcode: dependencies.hotmartProductUcode,
      audit: dependencies.hotmartAudit,
    }),
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

  const productionPlannerEnabled =
    !dependencies.plannerPreview &&
    Boolean(dependencies.recipes && dependencies.ingredientCatalog);

  if (productionPlannerEnabled) {
    const authorize = createAuthMiddleware({
      gateway: dependencies.accessGateway,
      gatewayForContext: (context) =>
        createSupabaseAccessGateway({
          url: context.env.SUPABASE_URL,
          publishableKey: context.env.SUPABASE_PUBLISHABLE_KEY,
        }),
    });
    app.use("/api/me", authorize);
    app.use("/api/me/*", authorize);
    app.use("/api/weeks/*", authorize);
  }

  const productionRecipeRepository =
    productionPlannerEnabled && dependencies.recipes
      ? createJsonRecipeRepository(dependencies.recipes, {
          contentPreview: false,
        })
      : undefined;

  app.route(
    "/",
    createPlannerRoutes({
      plannerPreview: dependencies.plannerPreview ?? false,
      plannerService,
      previewUserId: dependencies.previewUserId,
      resolvePlannerRequest:
        productionPlannerEnabled &&
        productionRecipeRepository &&
        dependencies.ingredientCatalog
          ? (context) => {
              const authorizedUser = context.get("authorizedUser");
              return {
                plannerService: new PlannerService({
                  repository: new SupabasePlannerRepository(
                    context.get("userSupabase"),
                  ),
                  recipeRepository: productionRecipeRepository,
                  ingredientCatalog: dependencies.ingredientCatalog!,
                  includeDraftRecipes: false,
                  seed: "planner-production",
                  idGenerator: dependencies.idGenerator,
                }),
                userId: authorizedUser.userId,
                preview: false,
              };
            }
          : undefined,
    }),
  );

  return app;
}
