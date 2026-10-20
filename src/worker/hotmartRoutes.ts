import { Hono } from "hono";
import { z } from "zod";

import {
  HotmartEntitlementService,
  HotmartEntitlementServiceError,
  type HotmartAccessEvent,
  type HotmartEventGateway,
} from "../application/access/HotmartEntitlementService";
import {
  createAdminSupabaseClient,
  createSupabaseHotmartEventGateway,
} from "../infrastructure/supabase/createSupabaseClients";
import type { WorkerEnv } from "./authMiddleware";

const hotmartPayloadSchema = z.object({
  id: z.string().trim().min(1),
  creation_date: z.number().int().nonnegative(),
  event: z.string().trim().min(1),
  data: z.object({
    product: z.object({ ucode: z.string().trim().min(1) }),
    buyer: z.object({ email: z.string().trim().email() }),
    purchase: z.object({ transaction: z.string().trim().min(1) }),
  }),
});

export type HotmartAuditEntry = {
  event: "hotmart_wrong_product" | "hotmart_processing_failed";
  eventId?: string;
  requestId: string;
};

type HotmartRouteDependencies = {
  gateway?: HotmartEventGateway;
  hottok?: string;
  productUcode?: string;
  audit?: (entry: HotmartAuditEntry) => void;
  requestId?: () => string;
};

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function constantTimeEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index]! ^ rightDigest[index]!;
  }
  return difference === 0;
}

export function createHotmartRoutes(
  dependencies: HotmartRouteDependencies = {},
) {
  const app = new Hono<WorkerEnv>();
  const audit = dependencies.audit ?? ((entry) => console.warn(entry));
  const nextRequestId = dependencies.requestId ?? (() => crypto.randomUUID());

  app.post("/api/webhooks/hotmart", async (context) => {
    const requestId = nextRequestId();
    const configuredHottok = dependencies.hottok ?? context.env.HOTMART_HOTTOK;
    const receivedHottok = context.req.header("x-hotmart-hottok") ?? "";
    if (!(await constantTimeEqual(receivedHottok, configuredHottok))) {
      return context.json(
        {
          code: "INVALID_WEBHOOK",
          message: "No pudimos validar el webhook.",
          requestId,
        },
        401,
      );
    }

    const body: unknown = await context.req.json().catch(() => null);
    const parsed = hotmartPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        {
          code: "INVALID_WEBHOOK_PAYLOAD",
          message: "El webhook no tiene el formato esperado.",
          requestId,
        },
        400,
      );
    }

    const gateway =
      dependencies.gateway ??
      createSupabaseHotmartEventGateway(
        createAdminSupabaseClient(
          context.env.SUPABASE_URL,
          context.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
      );
    const service = new HotmartEntitlementService(
      gateway,
      dependencies.productUcode ?? context.env.HOTMART_PRODUCT_UCODE,
    );

    try {
      await service.process({
        id: parsed.data.id,
        creationDate: new Date(parsed.data.creation_date),
        event: parsed.data.event as HotmartAccessEvent,
        productUcode: parsed.data.data.product.ucode,
        buyerEmail: parsed.data.data.buyer.email,
        transaction: parsed.data.data.purchase.transaction,
      });
      return context.body(null, 204);
    } catch (error) {
      if (
        error instanceof HotmartEntitlementServiceError &&
        error.code === "WRONG_PRODUCT"
      ) {
        audit({
          event: "hotmart_wrong_product",
          eventId: parsed.data.id,
          requestId,
        });
        return context.body(null, 204);
      }

      audit({
        event: "hotmart_processing_failed",
        eventId: parsed.data.id,
        requestId,
      });
      return context.json(
        {
          code: "WEBHOOK_UNAVAILABLE",
          message: "No pudimos procesar el webhook.",
          requestId,
        },
        503,
      );
    }
  });

  return app;
}
