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
