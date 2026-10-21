import type {
  PlannerPreferences,
  ShoppingListItem,
  WeeklyPlan,
} from "../../domain/planner/planner";

export type StoredPlannerWeek = {
  plan: WeeklyPlan;
  shoppingItems: ShoppingListItem[];
};

export interface PlannerRepository {
  getPreferences(userId: string): Promise<PlannerPreferences | null>;
  savePreferences(
    userId: string,
    preferences: PlannerPreferences,
  ): Promise<void>;
  getWeek(userId: string, weekStart: string): Promise<StoredPlannerWeek | null>;
  listWeeks(userId: string): Promise<StoredPlannerWeek[]>;
  saveWeek(userId: string, week: StoredPlannerWeek): Promise<void>;
}
