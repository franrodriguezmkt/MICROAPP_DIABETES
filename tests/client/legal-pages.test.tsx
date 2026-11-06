import { render, screen } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AccountPage } from "../../src/client/features/account/AccountPage";
import { AccessPage } from "../../src/client/features/access/AccessPage";
import { AuthProvider } from "../../src/client/features/access/AuthProvider";
import { LegalPage } from "../../src/client/features/legal/LegalPage";
import type { AuthClient } from "../../src/client/lib/authClient";

const session = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  expires_at: 1_900_000_000,
  token_type: "bearer",
  user: { id: "user-one", email: "buyer@example.com" },
} as Session;

function fakeAuth(): AuthClient {
  return {
    async requestOtp() {},
    async verifyOtp() {
      return session;
    },
    async getSession() {
      return session;
    },
    async refreshSession() {
      return session;
    },
    onAuthStateChange() {
      return () => undefined;
    },
    async signOut() {},
    getPendingEmail() {
      return null;
    },
  };
}

describe("public legal and educational pages", () => {
  it("explains_the_product_data_boundary_in_privacy", () => {
    render(
      <MemoryRouter>
        <LegalPage type="privacy" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /privacidad/i })).toBeInTheDocument();
    expect(screen.getByText(/correo utilizado para activar el acceso/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare, Supabase, Hotmart/i)).toBeInTheDocument();
    expect(screen.getByText(/no vendemos tus datos personales/i)).toBeInTheDocument();
  });

  it("sets_usage_and_hotmart_refund_boundaries_in_terms", () => {
    render(
      <MemoryRouter>
        <LegalPage type="terms" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /términos de uso/i })).toBeInTheDocument();
    expect(screen.getByText(/acceso es personal/i)).toBeInTheDocument();
    expect(screen.getByText(/pago y los reembolsos se procesan en Hotmart/i)).toBeInTheDocument();
  });

  it("states_that_educational_content_never_replaces_professional_care", () => {
    render(
      <MemoryRouter>
        <LegalPage type="educational" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /aviso educativo/i })).toBeInTheDocument();
    expect(
      screen.getByText(/no reemplaza una consulta, un diagnóstico, un tratamiento ni una indicación profesional personalizada/i),
    ).toBeInTheDocument();
  });

  it("links_legal_information_from_activation", () => {
    render(
      <MemoryRouter>
        <AccessPage client={fakeAuth()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /privacidad/i })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: /términos/i })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: /aviso educativo/i })).toHaveAttribute("href", "/aviso-educativo");
  });

  it("links_legal_information_from_the_authenticated_account", async () => {
    render(
      <MemoryRouter>
        <AuthProvider client={fakeAuth()} accessProbe={async () => undefined}>
          <AccountPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacidad/i })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: /términos/i })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: /aviso educativo/i })).toHaveAttribute("href", "/aviso-educativo");
  });
});
