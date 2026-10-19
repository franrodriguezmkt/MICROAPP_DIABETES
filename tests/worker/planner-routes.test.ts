import { describe, expect, it } from "vitest";

import type { IngredientCatalogEntry } from "../../src/domain/ingredients/ingredientCatalog";
import type { Recipe, RecipeCategory } from "../../src/domain/recipes/recipe";
import { InMemoryPlannerRepository } from "../../src/infrastructure/planner/InMemoryPlannerRepository";
import { createWorkerApp } from "../../src/worker/app";

function makeRecipe(
  id: string,
  category: RecipeCategory,
  ingredientId: string,
): Recipe {
  return {
    id,
    slug: id,
    title: id,
    summary: `Resumen de ${id}`,
    category,
    servingsBase: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    ingredients: [
      {
        ingredientId,
        displayName: ingredientId,
        quantity: 100,
        unit: "g",
        preparationNote: null,
      },
    ],
    instructions: ["Preparar."],
    tags: [],
    allergens: [],
    publicationStatus: "draft",
    source: { fileName: "fixture.pdf", pageStart: 1, pageEnd: 1 },
  };
}

const recipes = (["breakfast", "lunch", "dinner", "snack"] as const).flatMap(
  (category) =>
    Array.from({ length: 2 }, (_, index) =>
      makeRecipe(
        `${category}-${index + 1}`,
        category,
        `${category}-ingredient-${index + 1}`,
      ),
    ),
);
const ingredientCatalog: IngredientCatalogEntry[] = recipes.map((recipe) => ({
  ingredientId: recipe.ingredients[0]!.ingredientId,
  label: recipe.ingredients[0]!.displayName,
  category: "produce",
}));

const preferences = {
  people: 2,
  enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
  excludedIngredientIds: [],
};

function jsonRequest(method: string, body?: unknown, headers?: HeadersInit) {
  return {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

describe("preview planner routes", () => {
  it("serves the complete planner and shopping contract", async () => {
    const repository = new InMemoryPlannerRepository();
    const app = createWorkerApp({
      repository,
      recipes,
      ingredientCatalog,
      plannerPreview: true,
      previewUserId: "server-preview-user",
      idGenerator: () => "route-manual-id",
    });

    const preferencesResponse = await app.request(
      "http://local.test/api/me/preferences",
      jsonRequest("PATCH", {
        preferences,
        confirmed: true,
        userId: "caller-controlled-user",
      }, { "x-user-id": "header-controlled-user" }),
    );
    expect(preferencesResponse.status).toBe(200);
    await expect(preferencesResponse.json()).resolves.toEqual({
      data: { preferences },
    });
    await expect(
      repository.getPreferences("server-preview-user"),
    ).resolves.toEqual(preferences);
    await expect(
      repository.getPreferences("caller-controlled-user"),
    ).resolves.toBeNull();

    const meResponse = await app.request("http://local.test/api/me");
    await expect(meResponse.json()).resolves.toEqual({
      data: { preferences, preview: true },
    });

    const weekResponse = await app.request(
      "http://local.test/api/weeks/2026-10-19",
    );
    expect(weekResponse.status).toBe(200);
    const weekBody = (await weekResponse.json()) as {
      data: { plan: { items: Array<{ id: string; recipeId: string; mealType: string }> } };
    };
    expect(weekBody.data.plan.items).toHaveLength(28);

    const regeneratedResponse = await app.request(
      "http://local.test/api/weeks/2026-10-19/regenerate",
      jsonRequest("POST", { confirmed: true }),
    );
    expect(regeneratedResponse.status).toBe(200);

    const regeneratedBody = (await regeneratedResponse.json()) as typeof weekBody;
    const target = regeneratedBody.data.plan.items.find(
      (item) => item.mealType === "breakfast",
    )!;
    const replacement = recipes.find(
      (recipe) =>
        recipe.category === "breakfast" && recipe.id !== target.recipeId,
    )!;
    const replacementResponse = await app.request(
      `http://local.test/api/weeks/2026-10-19/items/${encodeURIComponent(target.id)}`,
      jsonRequest("PUT", { recipeId: replacement.id }),
    );
    expect(replacementResponse.status).toBe(200);

    const shoppingResponse = await app.request(
      "http://local.test/api/weeks/2026-10-19/shopping-list",
    );
    const shoppingBody = (await shoppingResponse.json()) as {
      data: { items: Array<{ id: string; checked: boolean }> };
    };
    expect(shoppingBody.data.items.length).toBeGreaterThan(0);
    const generated = shoppingBody.data.items[0]!;

    const checkedResponse = await app.request(
      `http://local.test/api/weeks/2026-10-19/shopping-list/${encodeURIComponent(generated.id)}`,
      jsonRequest("PATCH", { checked: true }),
    );
    await expect(checkedResponse.json()).resolves.toEqual({
      data: { item: { ...generated, checked: true } },
    });

    const manualResponse = await app.request(
      "http://local.test/api/weeks/2026-10-19/shopping-list",
      jsonRequest("POST", { label: "Servilletas", category: "other" }),
    );
    const manualBody = (await manualResponse.json()) as {
      data: { item: { id: string } };
    };
    expect(manualBody.data.item.id).toBe("manual:route-manual-id");

    const deleteResponse = await app.request(
      `http://local.test/api/weeks/2026-10-19/shopping-list/${encodeURIComponent(manualBody.data.item.id)}`,
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({
      data: { deleted: true },
    });
  });

  it("returns stable validation errors with a request id", async () => {
    const app = createWorkerApp({
      repository: new InMemoryPlannerRepository(),
      recipes,
      ingredientCatalog,
      plannerPreview: true,
      previewUserId: "server-preview-user",
    });
    const response = await app.request(
      "http://local.test/api/me/preferences",
      jsonRequest("PATCH", {
        preferences: { ...preferences, people: 0 },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_REQUEST",
      message: "Revisa los datos enviados.",
      requestId: expect.any(String),
    });
  });

  it("keeps every planner route unavailable outside development preview", async () => {
    const app = createWorkerApp({ plannerPreview: false });
    const routes = [
      ["GET", "/api/me"],
      ["PATCH", "/api/me/preferences"],
      ["GET", "/api/weeks/2026-10-19"],
      ["POST", "/api/weeks/2026-10-19/regenerate"],
      ["PUT", "/api/weeks/2026-10-19/items/item"],
      ["GET", "/api/weeks/2026-10-19/shopping-list"],
      ["PATCH", "/api/weeks/2026-10-19/shopping-list/item"],
      ["POST", "/api/weeks/2026-10-19/shopping-list"],
      ["DELETE", "/api/weeks/2026-10-19/shopping-list/item"],
    ];

    for (const [method, path] of routes) {
      const response = await app.request(`http://local.test${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: ["PATCH", "POST", "PUT"].includes(method)
          ? JSON.stringify({})
          : undefined,
      });
      expect(response.status, `${method} ${path}`).toBe(503);
      await expect(response.json()).resolves.toEqual({
        code: "FEATURE_UNAVAILABLE",
        message: "Esta función todavía no está disponible.",
        requestId: expect.any(String),
      });
    }
  });
});
