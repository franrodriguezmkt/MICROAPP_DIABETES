import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { Recipe } from "../../src/domain/recipes/recipe";
import { RecipeCatalogPage } from "../../src/client/features/recipes/RecipeCatalogPage";
import { createJsonRecipeRepository } from "../../src/infrastructure/recipes/jsonRecipeRepository";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "recipe-dessert-01",
    slug: "pudin-de-chia",
    title: "Pudín de Chía",
    summary: "Preparación fría con vainilla.",
    category: "dessert",
    servingsBase: 2,
    prepMinutes: 120,
    cookMinutes: 0,
    ingredients: [
      {
        ingredientId: "chia-seeds",
        displayName: "semillas de chía",
        quantity: 4,
        unit: "tbsp",
        preparationNote: null,
      },
    ],
    instructions: ["Mezcla y refrigera."],
    tags: [],
    allergens: [],
    publicationStatus: "approved",
    source: { fileName: "recetas.pdf", pageStart: 1, pageEnd: 2 },
    ...overrides,
  };
}

function renderCatalogWith(recipes: Recipe[]) {
  const repository = createJsonRecipeRepository(recipes, {
    contentPreview: true,
  });

  return render(
    <MemoryRouter initialEntries={["/recetas"]}>
      <RecipeCatalogPage repository={repository} />
    </MemoryRouter>,
  );
}

describe("recipe catalog", () => {
  it("filters recipe cards by category and accent-insensitive search", async () => {
    const user = userEvent.setup();
    renderCatalogWith([
      recipe(),
      recipe({
        id: "recipe-lunch-01",
        slug: "pollo-al-limon",
        title: "Pollo al limón",
        category: "lunch",
      }),
    ]);

    expect(
      await screen.findByRole("link", { name: /pudín de chía/i }),
    ).toBeVisible();

    await user.type(
      screen.getByRole("searchbox", { name: /buscar recetas/i }),
      "pudin",
    );

    expect(
      screen.getByRole("link", { name: /pudín de chía/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /pollo al limón/i }),
    ).not.toBeInTheDocument();

    await user.clear(
      screen.getByRole("searchbox", { name: /buscar recetas/i }),
    );
    await user.click(screen.getByRole("button", { name: "Almuerzos" }));

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /pollo al limón/i }),
      ).toBeVisible();
    });
    expect(
      screen.queryByRole("link", { name: /pudín de chía/i }),
    ).not.toBeInTheDocument();
  });

  it("offers_snack_as_a_first_class_category", async () => {
    const user = userEvent.setup();
    renderCatalogWith([
      recipe(),
      recipe({
        id: "recipe-snack-01",
        slug: "yogur-con-frutos-rojos",
        title: "Yogur con frutos rojos",
        category: "snack",
      }),
    ]);

    const categories = screen.getByRole("group", {
      name: /categorías de recetas/i,
    });
    expect(
      within(categories).getAllByRole("button").map((button) => button.textContent),
    ).toEqual([
      "Todas",
      "Desayunos",
      "Almuerzos",
      "Cenas",
      "Snacks",
      "Postres",
    ]);

    await user.click(within(categories).getByRole("button", { name: "Snacks" }));

    expect(
      await screen.findByRole("link", { name: /yogur con frutos rojos/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /pudín de chía/i }),
    ).not.toBeInTheDocument();
    expect(within(categories).getByRole("button", { name: "Snacks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a safe review state when production has no approved recipes", async () => {
    renderCatalogWith([]);

    expect(
      await screen.findByText(/estamos revisando las recetas/i),
    ).toBeVisible();
    expect(screen.queryByText(/no hay contenido/i)).not.toBeInTheDocument();
  });
});
