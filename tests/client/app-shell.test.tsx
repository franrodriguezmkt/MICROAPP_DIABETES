import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppShell } from "../../src/client/components/AppShell";

function renderShell(path = "/recetas") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="recetas" element={<h1>Recetas</h1>} />
          <Route path="semana" element={<h1>Semana</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("app shell", () => {
  it("shows_the_five_destinations_in_the_approved_order", () => {
    renderShell();

    const navigation = screen.getByRole("navigation", {
      name: /navegación principal/i,
    });
    const labels = within(navigation)
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());

    expect(labels).toEqual([
      "Semana",
      "Compras",
      "Recetas",
      "Recursos",
      "Cuenta",
    ]);
  });

  it("marks_the_current_destination_semantically", () => {
    renderShell("/recetas");

    expect(screen.getByRole("link", { name: "Recetas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps_navigation_icons_decorative", () => {
    const { container } = renderShell();

    const icons = container.querySelectorAll("svg[data-app-icon]");
    expect(icons).toHaveLength(5);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    });
  });

  it("keeps the selected week when moving between Semana and Compras", () => {
    renderShell("/semana?week=2026-10-26");

    expect(screen.getByRole("link", { name: "Semana" })).toHaveAttribute(
      "href",
      "/semana?week=2026-10-26",
    );
    expect(screen.getByRole("link", { name: "Compras" })).toHaveAttribute(
      "href",
      "/compras?week=2026-10-26",
    );
  });
});
