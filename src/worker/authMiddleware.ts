import type { SupabaseClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";

import {
  AccessGatewayError,
  type AccessGateway,
  type AuthorizedUser,
} from "../application/access/AccessGateway";
import type { Database } from "../infrastructure/supabase/database.types";

export type AuthVariables = {
  authorizedUser: AuthorizedUser;
  userSupabase: SupabaseClient<Database>;
};

export type WorkerEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

type AuthMiddlewareOptions = {
  gateway: AccessGateway;
  requestId?: () => string;
};

function bearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

export function createAuthMiddleware({
  gateway,
  requestId = () => crypto.randomUUID(),
}: AuthMiddlewareOptions): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (context, next) => {
    const token = bearerToken(context.req.header("authorization"));
    if (!token) {
      return context.json(
        {
          code: "AUTH_REQUIRED",
          message: "Inicia sesión para continuar.",
          requestId: requestId(),
        },
        401,
      );
    }

    try {
      const access = await gateway.resolveAuthorizedUser(token);
      context.set("authorizedUser", access.user);
      context.set("userSupabase", access.userSupabase);
      await next();
    } catch (error) {
      const id = requestId();
      if (error instanceof AccessGatewayError) {
        if (error.code === "INVALID_TOKEN") {
          return context.json(
            {
              code: "INVALID_SESSION",
              message: "Tu sesión venció. Vuelve a ingresar.",
              requestId: id,
            },
            401,
          );
        }
        if (error.code === "INACTIVE_ENTITLEMENT") {
          return context.json(
            {
              code: "ACCESS_INACTIVE",
              message: "No encontramos un acceso activo para esta cuenta.",
              requestId: id,
            },
            403,
          );
        }
      }

      console.error("Access authorization failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        requestId: id,
      });
      return context.json(
        {
          code: "ACCESS_UNAVAILABLE",
          message: "No pudimos verificar tu acceso. Intenta nuevamente.",
          requestId: id,
        },
        503,
      );
    }
  };
}
