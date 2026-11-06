import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlannerRepository } from "../../src/application/planner/PlannerRepository";
import type { PlannerPreferences } from "../../src/domain/planner/planner";
import { InMemoryPlannerRepository } from "../../src/infrastructure/planner/InMemoryPlannerRepository";
import { SupabasePlannerRepository } from "../../src/infrastructure/planner/SupabasePlannerRepository";
import type { Database, Json } from "../../src/infrastructure/supabase/database.types";

const preferences: PlannerPreferences = {
  people: 2,
  enabledMeals: ["breakfast", "lunch", "dinner", "snack"],
  excludedIngredientIds: ["peanut"],
};

const firstWeek = {
  plan: {
    id: "week:2026-10-19:one",
    weekStart: "2026-10-19",
    people: 2,
    generatorVersion: "planner-v1",
    items: [
      {
        id: "monday-breakfast",
        date: "2026-10-19",
        mealType: "breakfast" as const,
        recipeId: "oats-breakfast",
        servings: 2,
        replaced: false,
      },
    ],
    notices: [],
  },
  shoppingItems: [
    {
      source: "generated" as const,
      id: "generated:oats:g",
      ingredientId: "oats",
      label: "Avena",
      quantity: 100,
      unit: "g" as const,
      category: "pantry" as const,
      checked: true,
      customized: false,
      hidden: false,
      includesToTaste: false,
    },
    {
      source: "manual" as const,
      id: "manual:napkins",
      label: "Servilletas",
      category: "other" as const,
      checked: false,
    },
  ],
};

const secondWeek = {
  plan: {
    ...firstWeek.plan,
    id: "week:2026-10-26:two",
    weekStart: "2026-10-26",
    items: firstWeek.plan.items.map((item) => ({
      ...item,
      id: "next-monday-breakfast",
      date: "2026-10-26",
    })),
  },
  shoppingItems: firstWeek.shoppingItems,
};

function createRpcFake() {
  const preferencesByUser = new Map<string, Record<string, unknown>>();
  const weeksByUser = new Map<string, Map<string, Json>>();
  const savedByUser = new Map<
    string,
    Map<string, { title: string; savedAt: string }>
  >();

  const client = {
    from(table: string) {
      if (table !== "user_preferences") throw new Error(`Unexpected table ${table}`);
      return {
        select() {
          return {
            eq(_column: string, userId: string) {
              return {
                async maybeSingle() {
                  return {
                    data: preferencesByUser.get(userId) ?? null,
                    error: null,
                  };
                },
              };
            },
          };
        },
        async upsert(row: Record<string, unknown>) {
          preferencesByUser.set(String(row.user_id), row);
          return { error: null };
        },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      const userId = String(args.p_user_id);
      if (name === "save_planner_week_snapshot") {
        const plan = args.p_plan as { weekStart: string };
        const userWeeks = weeksByUser.get(userId) ?? new Map<string, Json>();
        userWeeks.set(plan.weekStart, {
          plan: args.p_plan as Json,
          shoppingItems: args.p_shopping_items as Json,
        });
        weeksByUser.set(userId, userWeeks);
        return { data: undefined, error: null };
      }
      if (name === "get_planner_week_snapshot") {
        return {
          data: weeksByUser.get(userId)?.get(String(args.p_week_start)) ?? null,
          error: null,
        };
      }
      if (name === "list_planner_week_snapshots") {
        return {
          data: [...(weeksByUser.get(userId)?.values() ?? [])],
          error: null,
        };
      }
      if (name === "list_saved_planner_weeks") {
        const saved = savedByUser.get(userId) ?? new Map();
        const weeks = weeksByUser.get(userId) ?? new Map();
        return {
          data: [...saved.entries()].map(([weekStart, metadata]) => {
            const stored = weeks.get(weekStart) as {
              plan: typeof firstWeek.plan;
            };
            return {
              weekStart,
              title: metadata.title,
              savedAt: metadata.savedAt,
              people: stored.plan.people,
              mealCount: stored.plan.items.length,
              previewRecipeId: stored.plan.items[0]?.recipeId ?? null,
            };
          }),
          error: null,
        };
      }
      if (name === "save_planner_week_to_library") {
        const weekStart = String(args.p_week_start);
        const stored = weeksByUser.get(userId)?.get(weekStart);
        if (!stored) return { data: null, error: null };
        const saved = savedByUser.get(userId) ?? new Map();
        const current = saved.get(weekStart);
        saved.set(weekStart, {
          title: String(args.p_title),
          savedAt: current?.savedAt ?? "2026-11-05T20:00:00.000Z",
        });
        savedByUser.set(userId, saved);
        return {
          data: {
            weekStart,
            title: String(args.p_title),
            savedAt: saved.get(weekStart)!.savedAt,
            people: firstWeek.plan.people,
            mealCount: firstWeek.plan.items.length,
            previewRecipeId: firstWeek.plan.items[0]!.recipeId,
          },
          error: null,
        };
      }
      if (name === "rename_saved_planner_week") {
        const weekStart = String(args.p_week_start);
        const saved = savedByUser.get(userId)?.get(weekStart);
        if (!saved) return { data: null, error: null };
        saved.title = String(args.p_title);
        return {
          data: {
            weekStart,
            title: saved.title,
            savedAt: saved.savedAt,
            people: firstWeek.plan.people,
            mealCount: firstWeek.plan.items.length,
            previewRecipeId: firstWeek.plan.items[0]!.recipeId,
          },
          error: null,
        };
      }
      if (name === "delete_saved_planner_week") {
        const weekStart = String(args.p_week_start);
        const deleted = savedByUser.get(userId)?.delete(weekStart) ?? false;
        if (deleted) weeksByUser.get(userId)?.delete(weekStart);
        return { data: deleted, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

const repositoryFactories: Array<[string, () => PlannerRepository]> = [
  ["memory", () => new InMemoryPlannerRepository()],
  ["Supabase RPC", () => new SupabasePlannerRepository(createRpcFake())],
];

describe.each(repositoryFactories)("%s planner repository contract", (_name, create) => {
  it("returns missing preferences and weeks as null", async () => {
    const repository = create();
    await expect(repository.getPreferences("user-one")).resolves.toBeNull();
    await expect(repository.getWeek("user-one", "2026-10-19")).resolves.toBeNull();
  });

  it("saves and reads preferences", async () => {
    const repository = create();
    await repository.savePreferences("user-one", preferences);
    await expect(repository.getPreferences("user-one")).resolves.toEqual(
      preferences,
    );
  });

  it("saves a complete week with manual and checked shopping lines", async () => {
    const repository = create();
    await repository.saveWeek("user-one", firstWeek);
    await expect(repository.getWeek("user-one", "2026-10-19")).resolves.toEqual(
      firstWeek,
    );
  });

  it("lists multiple weeks in their stored form", async () => {
    const repository = create();
    await repository.saveWeek("user-one", firstWeek);
    await repository.saveWeek("user-one", secondWeek);
    await expect(repository.listWeeks("user-one")).resolves.toEqual([
      firstWeek,
      secondWeek,
    ]);
  });

  it("isolates the same week start between users", async () => {
    const repository = create();
    await repository.saveWeek("user-one", firstWeek);
    await expect(repository.getWeek("user-two", "2026-10-19")).resolves.toBeNull();
  });

  it("lists only intentionally saved weeks and preserves their metadata on snapshot updates", async () => {
    const repository = create();
    await repository.saveWeek("user-one", firstWeek);
    await expect(repository.listSavedWeeks("user-one")).resolves.toEqual([]);

    const saved = await repository.saveWeekToLibrary(
      "user-one",
      "2026-10-19",
      "Semana familiar",
    );
    expect(saved).toMatchObject({
      weekStart: "2026-10-19",
      title: "Semana familiar",
      people: 2,
      mealCount: 1,
      previewRecipeId: "oats-breakfast",
    });

    await repository.saveWeek("user-one", {
      ...firstWeek,
      shoppingItems: firstWeek.shoppingItems.map((item) => ({
        ...item,
        checked: false,
      })),
    });

    await expect(repository.listSavedWeeks("user-one")).resolves.toEqual([
      saved,
    ]);
  });

  it("renames and deletes only the owner's saved week", async () => {
    const repository = create();
    await repository.saveWeek("user-one", firstWeek);
    await repository.saveWeekToLibrary(
      "user-one",
      "2026-10-19",
      "Semana original",
    );

    await expect(
      repository.renameSavedWeek(
        "user-one",
        "2026-10-19",
        "Semana nueva",
      ),
    ).resolves.toMatchObject({ title: "Semana nueva" });
    await expect(
      repository.renameSavedWeek(
        "user-two",
        "2026-10-19",
        "No permitida",
      ),
    ).resolves.toBeNull();
    await expect(
      repository.deleteSavedWeek("user-two", "2026-10-19"),
    ).resolves.toBe(false);
    await expect(
      repository.deleteSavedWeek("user-one", "2026-10-19"),
    ).resolves.toBe(true);
    await expect(repository.getWeek("user-one", "2026-10-19")).resolves.toBeNull();
  });
});

describe("Supabase planner response validation", () => {
  it("rejects a malformed snapshot instead of leaking it into the domain", async () => {
    const malformedClient = {
      rpc: async () => ({ data: { plan: { bad: true } }, error: null }),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabasePlannerRepository(malformedClient);

    await expect(repository.getWeek("user-one", "2026-10-19")).rejects.toThrow();
  });
});
