import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SavedWeeksPage } from "../../src/client/features/planner/SavedWeeksPage";
import { nextAvailableWeekStart } from "../../src/client/features/planner/savedWeekViewModel";
import type { PlannerClient } from "../../src/client/lib/plannerClient";
import type { SavedWeekSummary } from "../../src/domain/planner/planner";
import type { Recipe } from "../../src/domain/recipes/recipe";

const savedWeek: SavedWeekSummary = {
  weekStart: "2026-11-09",
  title: "Semana familiar",
  savedAt: "2026-11-05T20:00:00.000Z",
  people: 2,
  mealCount: 28,
  previewRecipeId: "recipe-breakfast-01",
};

const recipe: Recipe = {
  id: "recipe-breakfast-01",
  slug: "avena-cocida",
  title: "Avena cocida",
  summary: "Avena con manzana.",
  category: "breakfast",
  imagePath: "/recipes/avena-cocida.webp",
  servingsBase: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  ingredients: [],
  instructions: ["Preparar."],
  tags: [],
  allergens: [],
  publicationStatus: "approved",
  source: { fileName: "fixture.pdf", pageStart: 1, pageEnd: 1 },
};

function client(overrides: Partial<PlannerClient> = {}): PlannerClient {
  return {
    getMe: vi.fn(),
    updatePreferences: vi.fn(),
    getWeek: vi.fn(),
    regenerateWeek: vi.fn(),
    replaceItem: vi.fn(),
    getShoppingList: vi.fn(),
    patchShoppingItem: vi.fn(),
    addManualShoppingItem: vi.fn(),
    deleteShoppingItem: vi.fn(),
    listSavedWeeks: vi.fn().mockResolvedValue([]),
    saveWeekToLibrary: vi.fn(),
    renameSavedWeek: vi.fn(),
    deleteSavedWeek: vi.fn(),
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}{location.search}</p>;
}

function renderPage(plannerClient: PlannerClient, recipes: Recipe[] = [recipe]) {
  return render(
    <MemoryRouter initialEntries={["/mis-semanas"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <SavedWeeksPage
                client={plannerClient}
                recipes={recipes}
                initialWeekStart="2026-11-02"
              />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SavedWeeksPage", () => {
  it("shows an actionable empty state and creates the first available week", async () => {
    const user = userEvent.setup();
    renderPage(client());

    expect(await screen.findByText(/todavía no guardaste semanas/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /crear mi primera semana/i }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/semana?week=2026-11-09",
    );
  });

  it("opens, renames and deletes a saved week after confirmation", async () => {
    const user = userEvent.setup();
    const renameSavedWeek = vi.fn().mockResolvedValue({
      ...savedWeek,
      title: "Semana renovada",
    });
    const deleteSavedWeek = vi.fn().mockResolvedValue(undefined);
    renderPage(
      client({
        listSavedWeeks: vi.fn().mockResolvedValue([savedWeek]),
        renameSavedWeek,
        deleteSavedWeek,
      }),
    );

    const card = await screen.findByRole("article", { name: /semana familiar/i });
    expect(within(card).getByRole("presentation")).toHaveAttribute(
      "src",
      recipe.imagePath,
    );
    expect(within(card).getByText(/28 comidas/i)).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: /renombrar/i }));
    const nameInput = screen.getByRole("textbox", { name: /nombre de la semana/i });
    await user.clear(nameInput);
    await user.type(nameInput, "Semana renovada");
    await user.click(screen.getByRole("button", { name: /^guardar nombre$/i }));
    expect(renameSavedWeek).toHaveBeenCalledWith(
      savedWeek.weekStart,
      "Semana renovada",
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Semana renovada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /eliminar/i }));
    expect(screen.getByRole("dialog", { name: /eliminar semana/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^sí, eliminar$/i }));
    expect(deleteSavedWeek).toHaveBeenCalledWith(
      savedWeek.weekStart,
      expect.any(AbortSignal),
    );
    expect(await screen.findByText(/todavía no guardaste semanas/i)).toBeInTheDocument();
  });

  it("keeps a saved week usable when its preview recipe is unavailable", async () => {
    renderPage(
      client({ listSavedWeeks: vi.fn().mockResolvedValue([savedWeek]) }),
      [],
    );

    expect(await screen.findByText("Semana familiar")).toBeInTheDocument();
    expect(screen.getByText(/menú guardado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir semana/i })).toHaveAttribute(
      "href",
      "/semana?week=2026-11-09",
    );
  });
});

describe("nextAvailableWeekStart", () => {
  it("skips every saved Monday after the current week", () => {
    expect(
      nextAvailableWeekStart("2026-11-02", [
        savedWeek,
        { ...savedWeek, weekStart: "2026-11-16" },
      ]),
    ).toBe("2026-11-23");
  });
});
