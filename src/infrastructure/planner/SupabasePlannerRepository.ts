import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  PlannerRepository,
  StoredPlannerWeek,
} from "../../application/planner/PlannerRepository";
import {
  plannerPreferencesSchema,
  shoppingListItemSchema,
  weeklyPlanSchema,
  type PlannerPreferences,
} from "../../domain/planner/planner";
import type { Database, Json } from "../supabase/database.types";

const preferencesRowSchema = z.object({
  people: z.number(),
  enabled_meals: z.unknown(),
  excluded_ingredient_ids: z.unknown(),
});

const storedWeekSchema = z.object({
  plan: weeklyPlanSchema,
  shoppingItems: z.array(shoppingListItemSchema),
});

function databaseError(operation: string, error: { message: string }) {
  return new Error(`${operation} failed: ${error.message}`);
}

export class SupabasePlannerRepository implements PlannerRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getPreferences(userId: string) {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("people, enabled_meals, excluded_ingredient_ids")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw databaseError("get preferences", error);
    if (!data) return null;

    const row = preferencesRowSchema.parse(data);
    return plannerPreferencesSchema.parse({
      people: row.people,
      enabledMeals: row.enabled_meals,
      excludedIngredientIds: row.excluded_ingredient_ids,
    });
  }

  async savePreferences(userId: string, preferences: PlannerPreferences) {
    const parsed = plannerPreferencesSchema.parse(preferences);
    const { error } = await this.client.from("user_preferences").upsert(
      {
        user_id: userId,
        people: parsed.people,
        enabled_meals: parsed.enabledMeals,
        excluded_ingredient_ids: parsed.excludedIngredientIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw databaseError("save preferences", error);
  }

  async getWeek(userId: string, weekStart: string) {
    const { data, error } = await this.client.rpc(
      "get_planner_week_snapshot",
      { p_user_id: userId, p_week_start: weekStart },
    );
    if (error) throw databaseError("get planner week", error);
    if (data === null) return null;
    return storedWeekSchema.parse(data);
  }

  async listWeeks(userId: string) {
    const { data, error } = await this.client.rpc(
      "list_planner_week_snapshots",
      { p_user_id: userId },
    );
    if (error) throw databaseError("list planner weeks", error);
    return z.array(storedWeekSchema).parse(data ?? []);
  }

  async saveWeek(userId: string, week: StoredPlannerWeek) {
    const parsed = storedWeekSchema.parse(week);
    const { error } = await this.client.rpc("save_planner_week_snapshot", {
      p_user_id: userId,
      p_plan: parsed.plan as unknown as Json,
      p_shopping_items: parsed.shoppingItems as unknown as Json,
    });
    if (error) throw databaseError("save planner week", error);
  }
}
