import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { LandingPage } from "../../src/client/features/landing/LandingPage";

function renderLanding(checkoutUrl?: string | null) {
  return render(
    <MemoryRouter>
      <LandingPage checkoutUrl={checkoutUrl} />
    </MemoryRouter>,
  );
}

describe("public product landing", () => {
  it("renders_the_complete_product_story_for_public_visitors", () => {
    renderLanding(null);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /organiza tus recetas, tu semana y tus compras/i,
      }),
    ).toBeInTheDocument();

    for (const sectionName of [
      /una semana lista para seguir/i,
      /una compra más clara/i,
      /recetas para cada momento/i,
      /todo lo que incluye/i,
      /cómo funciona/i,
      /preguntas frecuentes/i,
    ]) {
      expect(screen.getByRole("heading", { name: sectionName })).toBeInTheDocument();
    }

    expect(screen.getByText(/contenido es educativo y no reemplaza/i)).toBeInTheDocument();
  });

  it("uses_only_a_valid_https_hotmart_checkout", () => {
    renderLanding("https://pay.hotmart.com/ABC123?checkoutMode=10");

    const purchaseLinks = screen.getAllByRole("link", { name: /quiero mi acceso/i });
    expect(purchaseLinks.length).toBeGreaterThan(1);
    purchaseLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        "https://pay.hotmart.com/ABC123?checkoutMode=10",
      );
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it.each([
    "javascript:alert(1)",
    "http://pay.hotmart.com/ABC123",
    "https://hotmart.com.evil.example/ABC123",
    "https://example.com/ABC123",
  ])("keeps_purchase_unavailable_without_a_safe_checkout: %s", (url) => {
    renderLanding(url);

    expect(
      screen.getAllByText(/compra disponible próximamente/i),
    ).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /quiero mi acceso/i })).not.toBeInTheDocument();
  });

  it("keeps_activation_as_a_separate_existing_buyer_action", () => {
    renderLanding("https://pay.hotmart.com/ABC123");

    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("link", { name: /ya compré: activar acceso/i }),
    ).toHaveAttribute("href", "/activar");
  });
});
