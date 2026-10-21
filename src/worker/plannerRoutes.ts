import { Hono, type Context } from "hono";
import { z, ZodError } from "zod";

import {
  PlannerService,
  PlannerServiceError,
} from "../application/planner/PlannerService";
import { plannerPreferencesSchema } from "../domain/planner/planner";
import type { WorkerEnv } from "./authMiddleware";

export type PlannerRouteDependencies = {
  plannerPreview: boolean;
  plannerService?: PlannerService;
  previewUserId?: string;
  resolvePlannerRequest?: (context: Context<WorkerEnv>) => {
    plannerService: PlannerService;
    userId: string;
    preview: boolean;
  };
};

const confirmationSchema = z.object({ confirmed: z.boolean().optional() });
const preferencesRequestSchema = z.object({
  preferences: plannerPreferencesSchema,
  confirmed: z.boolean().optional(),
});
const replacementSchema = z.object({ recipeId: z.string().trim().min(1) });
const shoppingPatchSchema = z
  .object({
    checked: z.boolean().optional(),
    label: z.string().trim().min(1).optional(),
    quantity: z.number().positive().optional(),
    unitLabel: z.string().trim().min(1).optional(),
    category: z
      .enum([
        "produce",
        "protein",
        "dairy",
        "pantry",
        "bakery",
        "frozen",
        "other",
      ])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
const manualShoppingItemSchema = z.object({
  label: z.string().trim().min(1),
  quantity: z.number().positive().optional(),
  unitLabel: z.string().trim().min(1).optional(),
  category: z.enum([
    "produce",
    "protein",
    "dairy",
    "pantry",
    "bakery",
    "frozen",
    "other",
  ]),
});

function requestId() {
  return crypto.randomUUID();
}

async function parseJson(context: Context<WorkerEnv>) {
  return context.req.json().catch(() => null);
}

async function respond(
  context: Context<WorkerEnv>,
  action: () => Promise<Record<string, unknown>>,
) {
  try {
    return context.json({ data: await action() });
  } catch (error) {
    if (error instanceof ZodError) {
      return context.json(
        {
          code: "INVALID_REQUEST",
          message: "Revisa los datos enviados.",
          requestId: requestId(),
        },
        400,
      );
    }
    if (error instanceof PlannerServiceError) {
      return context.json(
        {
          code: error.code,
          message: error.message,
          requestId: requestId(),
        },
        error.status as 400,
      );
    }
    console.error("Planner route failed", error);
    return context.json(
      {
        code: "INTERNAL_ERROR",
        message: "No pudimos completar la solicitud.",
        requestId: requestId(),
      },
      500,
    );
  }
}

export function createPlannerRoutes({
  plannerPreview,
  plannerService,
  previewUserId,
  resolvePlannerRequest,
}: PlannerRouteDependencies) {
  const app = new Hono<WorkerEnv>();

  function requestPlanner(context: Context<WorkerEnv>) {
    if (plannerPreview && plannerService && previewUserId) {
      return {
        plannerService,
        userId: previewUserId,
        preview: true,
      };
    }
    return resolvePlannerRequest?.(context);
  }

  app.use("/api/*", async (context, next) => {
    if (
      !(plannerPreview && plannerService && previewUserId) &&
      !resolvePlannerRequest
    ) {
      return context.json(
        {
          code: "FEATURE_UNAVAILABLE",
          message: "Esta función todavía no está disponible.",
          requestId: requestId(),
        },
        503,
      );
    }
    await next();
  });

  app.get("/api/me", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      return {
        preferences: await request.plannerService.getPreferences(request.userId),
        preview: request.preview,
      };
    }),
  );

  app.patch("/api/me/preferences", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      const body = preferencesRequestSchema.parse(await parseJson(context));
      const preferences = await request.plannerService.updatePreferences(
        request.userId,
        body.preferences,
        { confirmed: body.confirmed },
      );
      return { preferences };
    }),
  );

  app.get("/api/weeks/:weekStart", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      return {
        plan: await request.plannerService.getOrGenerateWeek(
          request.userId,
          context.req.param("weekStart"),
        ),
      };
    }),
  );

  app.post("/api/weeks/:weekStart/regenerate", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      const body = confirmationSchema.parse(await parseJson(context));
      return {
        plan: await request.plannerService.regenerateWeek(
          request.userId,
          context.req.param("weekStart"),
          body,
        ),
      };
    }),
  );

  app.put("/api/weeks/:weekStart/items/:itemId", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      const body = replacementSchema.parse(await parseJson(context));
      return {
        plan: await request.plannerService.replaceItem(
          request.userId,
          context.req.param("weekStart"),
          context.req.param("itemId"),
          body.recipeId,
        ),
      };
    }),
  );

  app.get("/api/weeks/:weekStart/shopping-list", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      return {
        items: await request.plannerService.getShoppingList(
          request.userId,
          context.req.param("weekStart"),
        ),
      };
    }),
  );

  app.patch("/api/weeks/:weekStart/shopping-list/:itemId", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      const patch = shoppingPatchSchema.parse(await parseJson(context));
      return {
        item: await request.plannerService.patchShoppingItem(
          request.userId,
          context.req.param("weekStart"),
          context.req.param("itemId"),
          patch,
        ),
      };
    }),
  );

  app.post("/api/weeks/:weekStart/shopping-list", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      const item = manualShoppingItemSchema.parse(await parseJson(context));
      return {
        item: await request.plannerService.addManualShoppingItem(
          request.userId,
          context.req.param("weekStart"),
          item,
        ),
      };
    }),
  );

  app.delete("/api/weeks/:weekStart/shopping-list/:itemId", (context) =>
    respond(context, async () => {
      const request = requestPlanner(context)!;
      await request.plannerService.deleteManualShoppingItem(
        request.userId,
        context.req.param("weekStart"),
        context.req.param("itemId"),
      );
      return { deleted: true };
    }),
  );

  return app;
}
