import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PreferencesForm } from "../../src/client/features/planner/PreferencesForm";
import type { IngredientCatalogEntry } from "../../src/domain/ingredients/ingredientCatalog";

const ingredients: IngredientCatalogEntry[] = [
  { ingredientId: "tomato", label: "Tomate", category: "produce" },
  { ingredientId: "peanut", label: "Maní", category: "pantry" },
];

describe("PreferencesForm", () => {
  it("saves people, meals and searchable ingredient exclusions", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <PreferencesForm ingredientCatalog={ingredients} onSave={onSave} />,
    );

    const people = screen.getByRole("spinbutton", {
      name: /personas/i,
    });
    expect(people).toHaveAttribute("min", "1");
    expect(people).toHaveAttribute("max", "12");
    await user.clear(people);
    await user.type(people, "3");

    await user.type(
      screen.getByRole("searchbox", { name: /buscar ingrediente/i }),
      "maní",
    );
    await user.click(screen.getByRole("checkbox", { name: "Maní" }));
    await user.click(screen.getByRole("button", { name: /organizar mi semana/i }));

    expect(onSave).toHaveBeenCalledWith({
      people: 3,
      enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
      excludedIngredientIds: ["peanut"],
    });
  });

  it("requires at least one meal and exposes 44px control classes", async () => {
    const user = userEvent.setup();
    render(
      <PreferencesForm ingredientCatalog={ingredients} onSave={vi.fn()} />,
    );

    for (const name of ["Desayuno", "Almuerzo", "Cena", "Snack"]) {
      const control = screen.getByRole("checkbox", { name });
      expect(control).toHaveClass("planner-control");
      await user.click(control);
    }
    await user.click(screen.getByRole("button", { name: /organizar mi semana/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /elige al menos un momento/i,
    );
  });
});
