import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { WeekPage } from "../../src/client/features/planner/WeekPage";
import type { PlannerClient } from "../../src/client/lib/plannerClient";
import type { IngredientCatalogEntry } from "../../src/domain/ingredients/ingredientCatalog";
import type { WeeklyPlan } from "../../src/domain/planner/planner";
import type { Recipe } from "../../src/domain/recipes/recipe";

function recipe(id: string, title: string): Recipe {
  return {
    id,
    slug: id,
    title,
    summary: `Resumen de ${title}`,
    category: "breakfast",
    servingsBase: 2,
    prepMinutes: 5,
    cookMinutes: 5,
    ingredients: [
      {
        ingredientId: "tomato",
        displayName: "tomate",
        quantity: 1,
        unit: "unit",
        preparationNote: null,
      },
    ],
    instructions: ["Preparar."],
    tags: [],
    allergens: [],
    publicationStatus: "approved",
    source: { fileName: "fixture.pdf", pageStart: 1, pageEnd: 1 },
  };
}

const recipes = [recipe("breakfast-one", "Tostada fresca"), recipe("breakfast-two", "Avena suave")];
const ingredients: IngredientCatalogEntry[] = [
  { ingredientId: "tomato", label: "Tomate", category: "produce" },
];
const preferences = {
  people: 2,
  enabledMeals: ["breakfast"] as const,
  excludedIngredientIds: [],
};
const plan: WeeklyPlan = {
  id: "week:test",
  weekStart: "2026-10-19",
  people: 2,
  generatorVersion: "planner-v1",
  items: Array.from({ length: 7 }, (_, index) => ({
    id: `item-${index}`,
    date: `2026-10-${19 + index}`,
    mealType: "breakfast" as const,
    recipeId: "breakfast-one",
    servings: 2,
    replaced: false,
  })),
  notices: ["Solo encontramos algunas opciones; se repiten con cuidado."],
};

function createClient(overrides: Partial<PlannerClient> = {}): PlannerClient {
  return {
    getMe: vi.fn().mockResolvedValue({ preferences: null, preview: true }),
    updatePreferences: vi.fn().mockResolvedValue(preferences),
    getWeek: vi.fn().mockResolvedValue(plan),
    regenerateWeek: vi.fn().mockResolvedValue(plan),
    replaceItem: vi.fn().mockResolvedValue(plan),
    getShoppingList: vi.fn().mockResolvedValue([]),
    patchShoppingItem: vi.fn(),
    addManualShoppingItem: vi.fn(),
    deleteManualShoppingItem: vi.fn(),
    ...overrides,
  };
}

function renderWeek(page: React.ReactNode, initialEntry = "/semana") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>{page}</MemoryRouter>,
  );
}

describe("WeekPage", () => {
  it("shows onboarding and generates the first week", async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
    );

    expect(await screen.findByRole("heading", { name: /organiza tu semana/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /organizar mi semana/i }));

    expect(client.updatePreferences).toHaveBeenCalled();
    expect(client.getWeek).toHaveBeenCalledWith("2026-10-19", expect.any(AbortSignal));
    expect(await screen.findByRole("heading", { name: /tu semana/i })).toBeInTheDocument();
  });

  it("renders seven days, notices, navigation and a single-card replacement", async () => {
    const user = userEvent.setup();
    const replacedPlan = {
      ...plan,
      items: plan.items.map((item, index) =>
        index === 0
          ? { ...item, recipeId: "breakfast-two", replaced: true }
          : item,
      ),
    };
    const client = createClient({
      getMe: vi.fn().mockResolvedValue({ preferences, preview: true }),
      replaceItem: vi.fn().mockResolvedValue(replacedPlan),
    });
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
    );

    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(7);
    expect(screen.getByRole("status")).toHaveTextContent(/se repiten/i);
    expect(screen.getByRole("button", { name: /semana anterior/i })).toHaveClass("planner-control");
    await user.click(screen.getAllByRole("button", { name: /cambiar receta/i })[0]!);

    const dialog = screen.getByRole("dialog", { name: /cambiar desayuno/i });
    await user.click(within(dialog).getByRole("button", { name: /elegir avena suave/i }));
    expect(client.replaceItem).toHaveBeenCalledWith(
      "2026-10-19",
      "item-0",
      "breakfast-two",
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Avena suave")).toBeInTheDocument();
  });

  it("uses in-page confirmation for regeneration and exposes retryable errors", async () => {
    const user = userEvent.setup();
    const client = createClient({
      getMe: vi.fn().mockResolvedValue({ preferences, preview: true }),
      getWeek: vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(plan),
    });
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar/i);
    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findAllByText("Tostada fresca")).toHaveLength(7);
    await user.click(screen.getByRole("button", { name: /reorganizar semana/i }));
    expect(screen.getByRole("dialog", { name: /confirmar reorganización/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /sí, reorganizar/i }));
    expect(client.regenerateWeek).toHaveBeenCalledWith(
      "2026-10-19",
      true,
      expect.any(AbortSignal),
    );
  });

  it("loads and advances the week selected in the address", async () => {
    const user = userEvent.setup();
    const client = createClient({
      getMe: vi.fn().mockResolvedValue({ preferences, preview: true }),
    });
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
      "/semana?week=2026-10-26",
    );

    expect(await screen.findByRole("heading", { name: /tu semana/i })).toBeInTheDocument();
    expect(client.getWeek).toHaveBeenCalledWith(
      "2026-10-26",
      expect.any(AbortSignal),
    );

    await user.click(screen.getByRole("button", { name: /semana siguiente/i }));
    expect(client.getWeek).toHaveBeenLastCalledWith(
      "2026-11-02",
      expect.any(AbortSignal),
    );
  });

  it("shows a recoverable message when recipe replacement fails", async () => {
    const user = userEvent.setup();
    const client = createClient({
      getMe: vi.fn().mockResolvedValue({ preferences, preview: true }),
      replaceItem: vi.fn().mockRejectedValue(new Error("offline")),
    });
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
    );

    await user.click((await screen.findAllByRole("button", { name: /cambiar receta/i }))[0]!);
    await user.click(screen.getByRole("button", { name: /elegir avena suave/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no pudimos cambiar la receta/i,
    );
    expect(screen.getByRole("dialog", { name: /cambiar desayuno/i })).toBeInTheDocument();
  });

  it("moves focus into the replacement dialog, traps it, closes with Escape and restores it", async () => {
    const user = userEvent.setup();
    const client = createClient({
      getMe: vi.fn().mockResolvedValue({ preferences, preview: true }),
    });
    renderWeek(
      <WeekPage
        client={client}
        recipes={recipes}
        ingredientCatalog={ingredients}
        initialWeekStart="2026-10-19"
      />,
    );

    const trigger = (await screen.findAllByRole("button", { name: /cambiar receta/i }))[0]!;
    await user.click(trigger);
    const close = screen.getByRole("button", { name: /cerrar opciones/i });
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /elegir avena suave/i })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /cambiar desayuno/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
