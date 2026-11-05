import type {
  PlannerRepository,
  StoredPlannerWeek,
} from "../../application/planner/PlannerRepository";
import {
  savedWeekTitleSchema,
  type PlannerPreferences,
  type SavedWeekSummary,
} from "../../domain/planner/planner";

type UserPlannerState = {
  preferences: PlannerPreferences | null;
  weeks: Map<string, StoredPlannerWeek>;
  savedWeeks: Map<string, { title: string; savedAt: string }>;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPlannerRepository implements PlannerRepository {
  private readonly users = new Map<string, UserPlannerState>();

  private stateFor(userId: string) {
    let state = this.users.get(userId);
    if (!state) {
      state = { preferences: null, weeks: new Map(), savedWeeks: new Map() };
      this.users.set(userId, state);
    }
    return state;
  }

  async getPreferences(userId: string) {
    const preferences = this.stateFor(userId).preferences;
    return preferences ? clone(preferences) : null;
  }

  async savePreferences(userId: string, preferences: PlannerPreferences) {
    this.stateFor(userId).preferences = clone(preferences);
  }

  async getWeek(userId: string, weekStart: string) {
    const week = this.stateFor(userId).weeks.get(weekStart);
    return week ? clone(week) : null;
  }

  async listWeeks(userId: string) {
    return [...this.stateFor(userId).weeks.values()].map(clone);
  }

  async saveWeek(userId: string, week: StoredPlannerWeek) {
    this.stateFor(userId).weeks.set(week.plan.weekStart, clone(week));
  }

  private summaryFor(userId: string, weekStart: string): SavedWeekSummary | null {
    const state = this.stateFor(userId);
    const week = state.weeks.get(weekStart);
    const metadata = state.savedWeeks.get(weekStart);
    if (!week || !metadata) return null;
    return {
      weekStart,
      title: metadata.title,
      savedAt: metadata.savedAt,
      people: week.plan.people,
      mealCount: week.plan.items.length,
      previewRecipeId: week.plan.items[0]?.recipeId ?? null,
    };
  }

  async listSavedWeeks(userId: string) {
    return [...this.stateFor(userId).savedWeeks.keys()]
      .map((weekStart) => this.summaryFor(userId, weekStart))
      .filter((summary): summary is SavedWeekSummary => summary !== null)
      .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
      .map(clone);
  }

  async saveWeekToLibrary(userId: string, weekStart: string, title: string) {
    const state = this.stateFor(userId);
    if (!state.weeks.has(weekStart)) return null;
    const current = state.savedWeeks.get(weekStart);
    state.savedWeeks.set(weekStart, {
      title: savedWeekTitleSchema.parse(title),
      savedAt: current?.savedAt ?? new Date().toISOString(),
    });
    return clone(this.summaryFor(userId, weekStart)!);
  }

  async renameSavedWeek(userId: string, weekStart: string, title: string) {
    const state = this.stateFor(userId);
    const current = state.savedWeeks.get(weekStart);
    if (!current) return null;
    current.title = savedWeekTitleSchema.parse(title);
    return clone(this.summaryFor(userId, weekStart)!);
  }

  async deleteSavedWeek(userId: string, weekStart: string) {
    const state = this.stateFor(userId);
    if (!state.savedWeeks.delete(weekStart)) return false;
    state.weeks.delete(weekStart);
    return true;
  }
}
