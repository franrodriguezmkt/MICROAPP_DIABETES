import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";

import { AccessPage } from "../../src/client/features/access/AccessPage";
import { VerifyAccessPage } from "../../src/client/features/access/VerifyAccessPage";
import {
  AuthClientError,
  createAuthClient,
  type AuthClient,
  type BrowserAuthPort,
} from "../../src/client/lib/authClient";

const session = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  expires_at: 1_900_000_000,
  token_type: "bearer",
  user: { id: "user-one", email: "buyer@example.com" },
} as Session;

function fakeClient(options: {
  pendingEmail?: string | null;
  verifyError?: Error;
  requestPromise?: Promise<void>;
} = {}): AuthClient {
  let pendingEmail = options.pendingEmail ?? null;
  return {
    async requestOtp(email) {
      await (options.requestPromise ?? Promise.resolve());
      pendingEmail = email.trim().toLowerCase();
    },
    async verifyOtp() {
      if (options.verifyError) throw options.verifyError;
      pendingEmail = null;
      return session;
    },
    async getSession() {
      return null;
    },
    onAuthStateChange() {
      return () => undefined;
    },
    async signOut() {},
    getPendingEmail() {
      return pendingEmail;
    },
  };
}

function renderFlow(client: AuthClient, initialEntry = "/activar") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/activar" element={<AccessPage client={client} />} />
        <Route
          path="/verificar"
          element={<VerifyAccessPage client={client} />}
        />
        <Route path="/semana" element={<h1>Tu semana privada</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("email OTP access flow", () => {
  it("asks only for the purchase email and moves to code verification", async () => {
    const user = userEvent.setup();
    renderFlow(fakeClient());

    expect(screen.queryByLabelText(/transacci[oó]n/i)).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: /correo usado en hotmart/i }),
      "Buyer@Example.com",
    );
    await user.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(
      await screen.findByRole("heading", { name: /revisa tu correo/i }),
    ).toBeInTheDocument();
  });

  it("disables the email action while the request is in progress", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const user = userEvent.setup();
    renderFlow(fakeClient({ requestPromise: pending }));

    await user.type(
      screen.getByRole("textbox", { name: /correo usado en hotmart/i }),
      "buyer@example.com",
    );
    await user.click(screen.getByRole("button", { name: /enviar código/i }));
    expect(
      screen.getByRole("button", { name: /enviando/i }),
    ).toBeDisabled();

    release();
    expect(
      await screen.findByRole("heading", { name: /revisa tu correo/i }),
    ).toBeInTheDocument();
  });

  it("validates six digits and moves focus to the error", async () => {
    const user = userEvent.setup();
    renderFlow(fakeClient({ pendingEmail: "buyer@example.com" }), "/verificar");

    await user.type(screen.getByLabelText(/código de seis dígitos/i), "123");
    await user.click(screen.getByRole("button", { name: /confirmar acceso/i }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Escribe los seis dígitos del código.");
    expect(alert).toHaveFocus();
  });

  it("shows an invalid or expired OTP error and can request a fresh code", async () => {
    const user = userEvent.setup();
    renderFlow(
      fakeClient({
        pendingEmail: "buyer@example.com",
        verifyError: new AuthClientError(
          "OTP_INVALID",
          "upstream details",
        ),
      }),
      "/verificar",
    );

    await user.type(screen.getByLabelText(/código de seis dígitos/i), "123456");
    await user.click(screen.getByRole("button", { name: /confirmar acceso/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El código no es válido o ya venció.",
    );

    await user.click(screen.getByRole("button", { name: /enviar otro código/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Te enviamos un código nuevo.",
    );
  });

  it("redirects to the private week after successful verification", async () => {
    const user = userEvent.setup();
    renderFlow(fakeClient({ pendingEmail: "buyer@example.com" }), "/verificar");

    await user.type(screen.getByLabelText(/código de seis dígitos/i), "123456");
    await user.click(screen.getByRole("button", { name: /confirmar acceso/i }));

    expect(
      await screen.findByRole("heading", { name: "Tu semana privada" }),
    ).toBeInTheDocument();
  });

  it("restores an existing browser session and signs it out", async () => {
    let signedOut = false;
    const auth: BrowserAuthPort = {
      async verifyOtp() {
        return { data: { session }, error: null };
      },
      async getSession() {
        return { data: { session }, error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signOut() {
        signedOut = true;
        return { error: null };
      },
    };
    const client = createAuthClient({
      auth,
      fetcher: async () =>
        new Response(JSON.stringify({ data: { message: "accepted" } }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
      storage: window.sessionStorage,
    });

    await expect(client.getSession()).resolves.toBe(session);
    await client.signOut();
    await waitFor(() => expect(signedOut).toBe(true));
  });
});
