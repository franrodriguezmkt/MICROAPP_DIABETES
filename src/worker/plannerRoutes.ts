import { Hono, type Context } from "hono";
import { z, ZodError } from "zod";

import {
  PlannerService,
  PlannerServiceError,
} from "../application/planner/PlannerService";
import { plannerPreferencesSchema } from "../domain/planner/planner";

export type PlannerRouteDependencies = {
  plannerPreview: boolean;
  plannerService?: PlannerService;
  previewUserId?: string;
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

async function parseJson(context: Context<WorkerBindings>) {
  return context.req.json().catch(() => null);
}

async function respond(
  context: Context<WorkerBindings>,
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
}: PlannerRouteDependencies) {
  const app = new Hono<WorkerBindings>();

  app.use("/api/*", async (context, next) => {
    if (!plannerPreview || !plannerService || !previewUserId) {
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
    respond(context, async () => ({
      preferences: await plannerService!.getPreferences(previewUserId!),
      preview: true,
    })),
  );

  app.patch("/api/me/preferences", (context) =>
    respond(context, async () => {
      const body = preferencesRequestSchema.parse(await parseJson(context));
      const preferences = await plannerService!.updatePreferences(
        previewUserId!,
        body.preferences,
        { confirmed: body.confirmed },
      );
      return { preferences };
    }),
  );

  app.get("/api/weeks/:weekStart", (context) =>
    respond(context, async () => ({
      plan: await plannerService!.getOrGenerateWeek(
        previewUserId!,
        context.req.param("weekStart"),
      ),
    })),
  );

  app.post("/api/weeks/:weekStart/regenerate", (context) =>
    respond(context, async () => {
      const body = confirmationSchema.parse(await parseJson(context));
      return {
        plan: await plannerService!.regenerateWeek(
          previewUserId!,
          context.req.param("weekStart"),
          body,
        ),
      };
    }),
  );

  app.put("/api/weeks/:weekStart/items/:itemId", (context) =>
    respond(context, async () => {
      const body = replacementSchema.parse(await parseJson(context));
      return {
        plan: await plannerService!.replaceItem(
          previewUserId!,
          context.req.param("weekStart"),
          context.req.param("itemId"),
          body.recipeId,
        ),
      };
    }),
  );

  app.get("/api/weeks/:weekStart/shopping-list", (context) =>
    respond(context, async () => ({
      items: await plannerService!.getShoppingList(
        previewUserId!,
        context.req.param("weekStart"),
      ),
    })),
  );

  app.patch("/api/weeks/:weekStart/shopping-list/:itemId", (context) =>
    respond(context, async () => {
      const patch = shoppingPatchSchema.parse(await parseJson(context));
      return {
        item: await plannerService!.patchShoppingItem(
          previewUserId!,
          context.req.param("weekStart"),
          context.req.param("itemId"),
          patch,
        ),
      };
    }),
  );

  app.post("/api/weeks/:weekStart/shopping-list", (context) =>
    respond(context, async () => {
      const item = manualShoppingItemSchema.parse(await parseJson(context));
      return {
        item: await plannerService!.addManualShoppingItem(
          previewUserId!,
          context.req.param("weekStart"),
          item,
        ),
      };
    }),
  );

  app.delete("/api/weeks/:weekStart/shopping-list/:itemId", (context) =>
    respond(context, async () => {
      await plannerService!.deleteManualShoppingItem(
        previewUserId!,
        context.req.param("weekStart"),
        context.req.param("itemId"),
      );
      return { deleted: true };
    }),
  );

  return app;
}
