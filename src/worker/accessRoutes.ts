import { Hono } from "hono";
import { z } from "zod";

import type { AccessRequestGateway } from "../application/access/AccessGateway";
import { createSupabaseAccessRequestGateway } from "../infrastructure/supabase/createSupabaseClients";
import type { WorkerEnv } from "./authMiddleware";

const accessRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

const acceptedMessage =
  "Si el correo tiene una compra activa, recibirás un código para continuar.";

export type AccessAuditEntry = {
  event: "access_otp_failed" | "access_request_failed";
  requestId: string;
  subjectHash?: string;
};

type AccessRouteDependencies = {
  gateway?: AccessRequestGateway;
  rateLimitPepper?: string;
  audit?: (entry: AccessAuditEntry) => void;
  requestId?: () => string;
};

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function privateHash(pepper: string, namespace: string, value: string) {
  return hex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${pepper}:${namespace}:${value}`),
    ),
  );
}

export function createAccessRoutes(
  dependencies: AccessRouteDependencies = {},
) {
  const app = new Hono<WorkerEnv>();
  const audit = dependencies.audit ?? ((entry) => console.warn(entry));
  const nextRequestId = dependencies.requestId ?? (() => crypto.randomUUID());

  app.post("/api/access/request", async (context) => {
    const requestId = nextRequestId();
    const body: unknown = await context.req.json().catch(() => null);
    const parsed = accessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        {
          code: "INVALID_REQUEST",
          message: "Escribe un correo válido.",
          requestId,
        },
        400,
      );
    }

    const gateway =
      dependencies.gateway ??
      createSupabaseAccessRequestGateway({
        url: context.env.SUPABASE_URL,
        publishableKey: context.env.SUPABASE_PUBLISHABLE_KEY,
        serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    const pepper =
      dependencies.rateLimitPepper ?? context.env.ACCESS_RATE_LIMIT_PEPPER;

    try {
      const origin = context.req.header("cf-connecting-ip") ?? "unknown";
      const [subjectHash, originHash] = await Promise.all([
        privateHash(pepper, "email", parsed.data.email),
        privateHash(pepper, "origin", origin),
      ]);

      if (!(await gateway.consumeAttempt(subjectHash, originHash))) {
        return context.json(
          {
            code: "RATE_LIMITED",
            message: "Espera unos minutos antes de volver a intentarlo.",
            requestId,
          },
          429,
        );
      }

      if (await gateway.hasActiveEntitlement(parsed.data.email)) {
        try {
          await gateway.sendOtp(parsed.data.email);
        } catch {
          audit({ event: "access_otp_failed", requestId, subjectHash });
        }
      }

      return context.json({ data: { message: acceptedMessage } }, 202);
    } catch {
      audit({ event: "access_request_failed", requestId });
      return context.json(
        {
          code: "ACCESS_UNAVAILABLE",
          message: "No pudimos procesar la solicitud. Intenta nuevamente.",
          requestId,
        },
        503,
      );
    }
  });

  return app;
}
