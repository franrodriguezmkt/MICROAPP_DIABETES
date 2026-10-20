import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AccountPage } from "../../src/client/features/account/AccountPage";
import {
  AuthProvider,
  type AccessProbe,
} from "../../src/client/features/access/AuthProvider";
import { PrivateRoute } from "../../src/client/features/access/PrivateRoute";
import type { AuthClient } from "../../src/client/lib/authClient";
import {
  PlannerClientError,
  createHttpPlannerClient,
} from "../../src/client/lib/plannerClient";

function makeSession(token = "access-token") {
  return {
    access_token: token,
    refresh_token: `refresh-${token}`,
    expires_in: 3600,
    expires_at: 1_900_000_000,
    token_type: "bearer",
    user: { id: "user-one", email: "buyer@example.com" },
  } as Session;
}

function fakeAuth(options: {
  session?: Session | null;
  sessionPromise?: Promise<Session | null>;
  refreshedSession?: Session | null;
} = {}): AuthClient {
  let current = options.session ?? null;
  return {
    async requestOtp() {},
    async verifyOtp() {
      current = makeSession();
      return current;
    },
    async getSession() {
      return options.sessionPromise ?? current;
    },
    async refreshSession() {
      current = options.refreshedSession ?? current;
      return current;
    },
    onAuthStateChange() {
      return () => undefined;
    },
    async signOut() {
      current = null;
    },
    getPendingEmail() {
      return null;
    },
  };
}

function ActivationDestination() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return <p>Destino guardado: {state?.from ?? "ninguno"}</p>;
}

function renderPrivate(
  client: AuthClient,
  accessProbe: AccessProbe,
  initialEntry = "/semana",
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/activar" element={<ActivationDestination />} />
        <Route
          element={<AuthProvider client={client} accessProbe={accessProbe} />}
        >
          <Route element={<PrivateRoute />}>
            <Route path="/semana" element={<h1>Semana protegida</h1>} />
            <Route path="/cuenta" element={<AccountPage />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("private application access", () => {
  it("shows a stable loading state while restoring the session", () => {
    const pending = new Promise<Session | null>(() => undefined);
    renderPrivate(fakeAuth({ sessionPromise: pending }), async () => undefined);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Verificando tu acceso…",
    );
  });

  it("redirects an anonymous user and preserves their destination", async () => {
    renderPrivate(
      fakeAuth({ session: null }),
      async () => undefined,
      "/semana?week=2026-10-26",
    );

    expect(await screen.findByText(/Destino guardado:/)).toHaveTextContent(
      "/semana?week=2026-10-26",
    );
  });

  it("renders private content after session and entitlement verification", async () => {
    renderPrivate(fakeAuth({ session: makeSession() }), async () => undefined);

    expect(
      await screen.findByRole("heading", { name: "Semana protegida" }),
    ).toBeInTheDocument();
  });

  it("redirects a revoked account to its safe inactive account state", async () => {
    const inactiveProbe = async () => {
      throw new PlannerClientError(
        "ACCESS_INACTIVE",
        "safe",
        "request-one",
        403,
      );
    };
    renderPrivate(fakeAuth({ session: makeSession() }), inactiveProbe);

    expect(
      await screen.findByRole("heading", { name: /tu cuenta/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/acceso inactivo/i)).toBeInTheDocument();
    expect(screen.queryByText(/transacci[oó]n/i)).not.toBeInTheDocument();
  });

  it("attaches the freshest session token to planner requests", async () => {
    const client = createHttpPlannerClient(
      async (_input, init) => {
        if (new Headers(init?.headers).get("authorization") !== "Bearer current-token") {
          return new Response("unauthorized", { status: 401 });
        }
        return new Response(
          JSON.stringify({ data: { preferences: null, preview: false } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
      fakeAuth({ session: makeSession("current-token") }),
    );

    await expect(client.getMe()).resolves.toEqual({
      preferences: null,
      preview: false,
    });
  });

  it("refreshes once after a 401 and retries with the new token", async () => {
    const auth = fakeAuth({
      session: makeSession("old-token"),
      refreshedSession: makeSession("new-token"),
    });
    const client = createHttpPlannerClient(
      async (_input, init) => {
        const header = new Headers(init?.headers).get("authorization");
        if (header === "Bearer old-token") {
          return new Response(
            JSON.stringify({
              code: "INVALID_SESSION",
              message: "expired",
              requestId: "first",
            }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ data: { preferences: null, preview: false } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
      auth,
    );

    await expect(client.getMe()).resolves.toEqual({
      preferences: null,
      preview: false,
    });
  });

  it("signs out from Cuenta and removes the private interface", async () => {
    const user = userEvent.setup();
    renderPrivate(
      fakeAuth({ session: makeSession() }),
      async () => undefined,
      "/cuenta",
    );

    await user.click(await screen.findByRole("button", { name: /cerrar sesión/i }));
    expect(await screen.findByText(/Destino guardado:/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /tu cuenta/i })).not.toBeInTheDocument();
  });
});
