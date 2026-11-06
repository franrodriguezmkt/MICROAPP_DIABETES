import type {
  PlannerPreferences,
  ShoppingListItem,
  SavedWeekSummary,
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
  listSavedWeeks(userId: string): Promise<SavedWeekSummary[]>;
  saveWeekToLibrary(
    userId: string,
    weekStart: string,
    title: string,
  ): Promise<SavedWeekSummary | null>;
  renameSavedWeek(
    userId: string,
    weekStart: string,
    title: string,
  ): Promise<SavedWeekSummary | null>;
  deleteSavedWeek(userId: string, weekStart: string): Promise<boolean>;
}
