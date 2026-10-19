import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShoppingPage } from "../../src/client/features/shopping/ShoppingPage";
import type { PlannerClient } from "../../src/client/lib/plannerClient";
import type { ShoppingListItem } from "../../src/domain/planner/planner";

const generated: ShoppingListItem[] = [
  {
    source: "generated",
    id: "generated:tomato:g",
    ingredientId: "tomato",
    label: "Tomate",
    quantity: 250,
    unit: "g",
    category: "produce",
    checked: false,
  },
  {
    source: "generated",
    id: "generated:salt:to_taste",
    ingredientId: "salt",
    label: "Sal",
    quantity: null,
    unit: "to_taste",
    category: "pantry",
    checked: false,
  },
];
const manual: ShoppingListItem = {
  source: "manual",
  id: "manual:one",
  label: "Servilletas",
  category: "other",
  checked: true,
};

function createClient(overrides: Partial<PlannerClient> = {}): PlannerClient {
  return {
    getMe: vi.fn(),
    updatePreferences: vi.fn(),
    getWeek: vi.fn(),
    regenerateWeek: vi.fn(),
    replaceItem: vi.fn(),
    getShoppingList: vi.fn().mockResolvedValue([...generated, manual]),
    patchShoppingItem: vi.fn().mockImplementation(
      async (_weekStart, itemId, patch) => ({
        ...[...generated, manual].find((item) => item.id === itemId)!,
        ...patch,
      }),
    ),
    addManualShoppingItem: vi.fn().mockResolvedValue({
      source: "manual",
      id: "manual:new",
      label: "Bolsas",
      category: "other",
      checked: false,
    }),
    deleteManualShoppingItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ShoppingPage", () => {
  it("renders generated and manual items in ordered groups with readable quantities", async () => {
    render(
      <ShoppingPage client={createClient()} initialWeekStart="2026-10-19" />,
    );

    expect(await screen.findByRole("heading", { name: "Frutas y verduras" })).toBeInTheDocument();
    expect(screen.getByText("250 g")).toBeInTheDocument();
    expect(screen.getByText("Al gusto")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Otros" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar tomate/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar servilletas/i })).toBeInTheDocument();
  });

  it("rolls back an optimistic check when saving fails", async () => {
    const user = userEvent.setup();
    const client = createClient({
      patchShoppingItem: vi.fn().mockRejectedValue(new Error("offline")),
    });
    render(
      <ShoppingPage client={client} initialWeekStart="2026-10-19" />,
    );
    const checkbox = await screen.findByRole("checkbox", { name: /tomate/i });

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(/no pudimos guardar/i);
  });

  it("adds and deletes manual items", async () => {
    const user = userEvent.setup();
    const client = createClient();
    render(
      <ShoppingPage client={client} initialWeekStart="2026-10-19" />,
    );

    await screen.findByText("Servilletas");
    await user.type(screen.getByRole("textbox", { name: /nuevo producto/i }), "Bolsas");
    await user.click(screen.getByRole("button", { name: /agregar producto/i }));
    expect(client.addManualShoppingItem).toHaveBeenCalledWith(
      "2026-10-19",
      { label: "Bolsas", category: "other" },
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Bolsas")).toBeInTheDocument();

    const otherGroup = screen.getByRole("region", { name: "Otros" });
    await user.click(within(otherGroup).getByRole("button", { name: /eliminar servilletas/i }));
    expect(client.deleteManualShoppingItem).toHaveBeenCalledWith(
      "2026-10-19",
      "manual:one",
      expect.any(AbortSignal),
    );
    expect(screen.queryByText("Servilletas")).not.toBeInTheDocument();
  });

  it("edits only the allowed fields of a manual item", async () => {
    const user = userEvent.setup();
    const client = createClient();
    render(
      <ShoppingPage client={client} initialWeekStart="2026-10-19" />,
    );

    await user.click(
      await screen.findByRole("button", { name: /editar servilletas/i }),
    );
    const input = screen.getByRole("textbox", { name: /editar servilletas/i });
    await user.clear(input);
    await user.type(input, "Papel de cocina");
    await user.click(screen.getByRole("button", { name: /guardar servilletas/i }));

    expect(client.patchShoppingItem).toHaveBeenCalledWith(
      "2026-10-19",
      "manual:one",
      { label: "Papel de cocina" },
      expect.any(AbortSignal),
    );
  });

  it("shows empty guidance and a retryable loading error", async () => {
    const user = userEvent.setup();
    const client = createClient({
      getShoppingList: vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue([]),
    });
    render(
      <ShoppingPage client={client} initialWeekStart="2026-10-19" />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos cargar/i);
    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText(/organiza primero tu semana/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir a semana/i })).toHaveAttribute("href", "/semana");
  });
});
