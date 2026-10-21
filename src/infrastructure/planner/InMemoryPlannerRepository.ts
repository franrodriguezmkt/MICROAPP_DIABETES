import type {
  PlannerRepository,
  StoredPlannerWeek,
} from "../../application/planner/PlannerRepository";
import type { PlannerPreferences } from "../../domain/planner/planner";

type UserPlannerState = {
  preferences: PlannerPreferences | null;
  weeks: Map<string, StoredPlannerWeek>;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPlannerRepository implements PlannerRepository {
  private readonly users = new Map<string, UserPlannerState>();

  private stateFor(userId: string) {
    let state = this.users.get(userId);
    if (!state) {
      state = { preferences: null, weeks: new Map() };
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
}
