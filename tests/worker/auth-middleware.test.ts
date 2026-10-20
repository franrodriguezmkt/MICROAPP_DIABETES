import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import {
  AccessGatewayError,
  type AccessGateway,
  type AuthorizedAccess,
} from "../../src/application/access/AccessGateway";
import {
  createAuthMiddleware,
  type AuthVariables,
} from "../../src/worker/authMiddleware";

const userClient = {
  kind: "user-client",
} as unknown as AuthorizedAccess["userSupabase"];

function testApp(gateway: AccessGateway) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("/private/*", createAuthMiddleware({ gateway, requestId: () => "request-one" }));
  app.get("/private/me", (context) => {
    const user = context.get("authorizedUser");
    return context.json({
      user,
      receivedUserClient: context.get("userSupabase") === userClient,
    });
  });
  return app;
}

function gatewayReturning(result: AuthorizedAccess): AccessGateway {
  return {
    async resolveAuthorizedUser() {
      return result;
    },
  };
}

function gatewayThrowing(error: Error): AccessGateway {
  return {
    async resolveAuthorizedUser() {
      throw error;
    },
  };
}

async function errorBody(response: Response) {
  return response.json() as Promise<{
    code: string;
    message: string;
    requestId: string;
  }>;
}

describe("authorized Worker routes", () => {
  it("rejects a missing bearer token with a stable 401 response", async () => {
    const response = await testApp(
      gatewayReturning({
        user: { userId: "user-one", email: "buyer@example.com" },
        userSupabase: userClient,
      }),
    ).request("http://local.test/private/me");

    expect(response.status).toBe(401);
    await expect(errorBody(response)).resolves.toEqual({
      code: "AUTH_REQUIRED",
      message: "Inicia sesión para continuar.",
      requestId: "request-one",
    });
  });

  it("rejects an invalid or expired bearer token", async () => {
    const response = await testApp(
      gatewayThrowing(
        new AccessGatewayError("INVALID_TOKEN", "invalid upstream token", 401),
      ),
    ).request("http://local.test/private/me", {
      headers: { authorization: "Bearer expired-token" },
    });

    expect(response.status).toBe(401);
    await expect(errorBody(response)).resolves.toEqual({
      code: "INVALID_SESSION",
      message: "Tu sesión venció. Vuelve a ingresar.",
      requestId: "request-one",
    });
  });

  it("rejects a valid user without an active entitlement", async () => {
    const response = await testApp(
      gatewayThrowing(
        new AccessGatewayError("INACTIVE_ENTITLEMENT", "no active purchase", 403),
      ),
    ).request("http://local.test/private/me", {
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(403);
    await expect(errorBody(response)).resolves.toEqual({
      code: "ACCESS_INACTIVE",
      message: "No encontramos un acceso activo para esta cuenta.",
      requestId: "request-one",
    });
  });

  it("rejects a user whose entitlement was revoked or expired", async () => {
    const response = await testApp(
      gatewayThrowing(
        new AccessGatewayError("INACTIVE_ENTITLEMENT", "revoked", 403),
      ),
    ).request("http://local.test/private/me", {
      headers: { authorization: "Bearer revoked-token" },
    });

    expect(response.status).toBe(403);
    expect((await errorBody(response)).code).toBe("ACCESS_INACTIVE");
  });

  it("injects the verified user and their scoped Supabase client", async () => {
    const app = testApp(
      gatewayReturning({
        user: { userId: "user-one", email: "buyer@example.com" },
        userSupabase: userClient,
      }),
    );
    const response = await app.request("http://local.test/private/me", {
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { userId: "user-one", email: "buyer@example.com" },
      receivedUserClient: true,
    });
  });

  it("returns a generic safe error when Supabase is unavailable", async () => {
    const response = await testApp(
      gatewayThrowing(
        new AccessGatewayError("UPSTREAM_UNAVAILABLE", "database timeout", 503),
      ),
    ).request("http://local.test/private/me", {
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(503);
    await expect(errorBody(response)).resolves.toEqual({
      code: "ACCESS_UNAVAILABLE",
      message: "No pudimos verificar tu acceso. Intenta nuevamente.",
      requestId: "request-one",
    });
  });
});
