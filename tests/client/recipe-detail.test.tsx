import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { RecipeDetailPage } from "../../src/client/features/recipes/RecipeDetailPage";
import type { Recipe } from "../../src/domain/recipes/recipe";
import { createJsonRecipeRepository } from "../../src/infrastructure/recipes/jsonRecipeRepository";

function renderDetail(recipe: Recipe) {
  const repository = createJsonRecipeRepository([recipe], {
    contentPreview: true,
  });

  return render(
    <MemoryRouter initialEntries={[`/recetas/${recipe.slug}`]}>
      <Routes>
        <Route
          path="/recetas/:slug"
          element={<RecipeDetailPage repository={repository} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("recipe detail", () => {
  it("shows allergen identifiers as familiar Spanish labels", async () => {
    const recipe: Recipe = {
      id: "recipe-lunch-01",
      slug: "ensalada-con-alergenos",
      title: "Ensalada con alérgenos",
      summary: "Preparación de ejemplo.",
      category: "lunch",
      servingsBase: 1,
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        {
          ingredientId: "ingredient",
          displayName: "ingrediente",
          quantity: 1,
          unit: "unit",
          preparationNote: null,
        },
      ],
      instructions: ["Preparar."],
      tags: [],
      allergens: ["egg", "milk", "tree-nuts"],
      publicationStatus: "approved",
      source: { fileName: "fuente.pdf", pageStart: 1, pageEnd: 1 },
    };

    renderDetail(recipe);

    expect(await screen.findByText("Huevo, leche, frutos secos")).toBeVisible();
    expect(screen.queryByText("egg, milk, tree-nuts")).not.toBeInTheDocument();
  });

  it("changes servings while preserving the source recipe", async () => {
    const user = userEvent.setup();
    const recipe: Recipe = {
      id: "recipe-breakfast-01",
      slug: "avena-canela-manzana",
      title: "Avena con canela y manzana",
      summary: "Preparación de avena basada en el documento fuente.",
      category: "breakfast",
      servingsBase: 2,
      prepMinutes: 5,
      cookMinutes: 10,
      ingredients: [
        {
          ingredientId: "rolled-oats",
          displayName: "avena en hojuelas",
          quantity: 100,
          unit: "g",
          preparationNote: null,
        },
      ],
      instructions: ["Cocina la avena sin dejar de remover."],
      tags: [],
      allergens: ["gluten"],
      publicationStatus: "approved",
      source: { fileName: "desayunos.pdf", pageStart: 6, pageEnd: 7 },
    };

    renderDetail(recipe);

    expect(await screen.findByText("100 g")).toBeVisible();
    const servings = screen.getByRole("spinbutton", { name: /porciones/i });
    await user.clear(servings);
    await user.type(servings, "3");

    expect(screen.getByText("150 g")).toBeVisible();
    expect(
      screen.getByText("Cocina la avena sin dejar de remover."),
    ).toBeVisible();
    expect(recipe.ingredients[0].quantity).toBe(100);
  });

  it("does not reveal whether an unavailable slug is a draft", async () => {
    const hiddenRecipe: Recipe = {
      id: "recipe-breakfast-02",
      slug: "receta-en-revision",
      title: "Receta en revisión",
      summary: "Contenido pendiente.",
      category: "breakfast",
      servingsBase: 1,
      prepMinutes: 0,
      cookMinutes: 0,
      ingredients: [
        {
          ingredientId: "ingredient",
          displayName: "ingrediente",
          quantity: 1,
          unit: "unit",
          preparationNote: null,
        },
      ],
      instructions: ["Paso pendiente."],
      tags: [],
      allergens: [],
      publicationStatus: "draft",
      source: { fileName: "fuente.pdf", pageStart: 1, pageEnd: 1 },
    };
    const productionRepository = createJsonRecipeRepository([hiddenRecipe], {
      contentPreview: false,
    });

    render(
      <MemoryRouter initialEntries={[`/recetas/${hiddenRecipe.slug}`]}>
        <Routes>
          <Route
            path="/recetas/:slug"
            element={<RecipeDetailPage repository={productionRepository} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no encontramos esta receta/i)).toBeVisible();
    expect(screen.queryByText(/borrador/i)).not.toBeInTheDocument();
  });
});
