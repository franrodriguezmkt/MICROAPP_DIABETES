import { z } from "zod";

import {
  plannerPreferencesSchema,
  shoppingListItemSchema,
  weeklyPlanSchema,
  type PlannerPreferences,
  type ShoppingCategory,
  type ShoppingListItem,
  type WeeklyPlan,
} from "../../domain/planner/planner";

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
});

const meSchema = z.object({
  preferences: plannerPreferencesSchema.nullable(),
  preview: z.boolean(),
});

export type ManualShoppingItemInput = {
  label: string;
  quantity?: number;
  unitLabel?: string;
  category: ShoppingCategory;
};

export type ShoppingItemPatch = Partial<
  Pick<
    Extract<ShoppingListItem, { source: "manual" }>,
    "checked" | "label" | "quantity" | "unitLabel" | "category"
  >
>;

export interface PlannerClient {
  getMe(signal?: AbortSignal): Promise<{
    preferences: PlannerPreferences | null;
    preview: boolean;
  }>;
  updatePreferences(
    preferences: PlannerPreferences,
    confirmed?: boolean,
    signal?: AbortSignal,
  ): Promise<PlannerPreferences>;
  getWeek(weekStart: string, signal?: AbortSignal): Promise<WeeklyPlan>;
  regenerateWeek(
    weekStart: string,
    confirmed: boolean,
    signal?: AbortSignal,
  ): Promise<WeeklyPlan>;
  replaceItem(
    weekStart: string,
    itemId: string,
    recipeId: string,
    signal?: AbortSignal,
  ): Promise<WeeklyPlan>;
  getShoppingList(
    weekStart: string,
    signal?: AbortSignal,
  ): Promise<ShoppingListItem[]>;
  patchShoppingItem(
    weekStart: string,
    itemId: string,
    patch: ShoppingItemPatch,
    signal?: AbortSignal,
  ): Promise<ShoppingListItem>;
  addManualShoppingItem(
    weekStart: string,
    input: ManualShoppingItemInput,
    signal?: AbortSignal,
  ): Promise<ShoppingListItem>;
  deleteManualShoppingItem(
    weekStart: string,
    itemId: string,
    signal?: AbortSignal,
  ): Promise<void>;
}

export class PlannerClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PlannerClientError";
  }
}

export function createHttpPlannerClient(
  fetcher: typeof fetch = fetch,
): PlannerClient {
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetcher(path, {
      ...options,
      headers: options.body
        ? { "content-type": "application/json", ...options.headers }
        : options.headers,
    });
    const payload: unknown = await response.json();

    if (!response.ok) {
      const parsedError = errorSchema.safeParse(payload);
      if (parsedError.success) {
        throw new PlannerClientError(
          parsedError.data.code,
          parsedError.data.message,
          parsedError.data.requestId,
          response.status,
        );
      }
      throw new PlannerClientError(
        "INVALID_RESPONSE",
        "El servidor devolvió una respuesta inesperada.",
        "unknown",
        response.status,
      );
    }

    return z.object({ data: schema }).parse(payload).data;
  }

  return {
    getMe(signal) {
      return request("/api/me", meSchema, { signal });
    },

    async updatePreferences(preferences, confirmed = false, signal) {
      const data = await request(
        "/api/me/preferences",
        z.object({ preferences: plannerPreferencesSchema }),
        {
          method: "PATCH",
          signal,
          body: JSON.stringify({ preferences, confirmed }),
        },
      );
      return data.preferences;
    },

    async getWeek(weekStart, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}`,
        z.object({ plan: weeklyPlanSchema }),
        { signal },
      );
      return data.plan;
    },

    async regenerateWeek(weekStart, confirmed, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/regenerate`,
        z.object({ plan: weeklyPlanSchema }),
        {
          method: "POST",
          signal,
          body: JSON.stringify({ confirmed }),
        },
      );
      return data.plan;
    },

    async replaceItem(weekStart, itemId, recipeId, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/items/${encodeURIComponent(itemId)}`,
        z.object({ plan: weeklyPlanSchema }),
        {
          method: "PUT",
          signal,
          body: JSON.stringify({ recipeId }),
        },
      );
      return data.plan;
    },

    async getShoppingList(weekStart, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/shopping-list`,
        z.object({ items: z.array(shoppingListItemSchema) }),
        { signal },
      );
      return data.items;
    },

    async patchShoppingItem(weekStart, itemId, patch, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/shopping-list/${encodeURIComponent(itemId)}`,
        z.object({ item: shoppingListItemSchema }),
        {
          method: "PATCH",
          signal,
          body: JSON.stringify(patch),
        },
      );
      return data.item;
    },

    async addManualShoppingItem(weekStart, input, signal) {
      const data = await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/shopping-list`,
        z.object({ item: shoppingListItemSchema }),
        {
          method: "POST",
          signal,
          body: JSON.stringify(input),
        },
      );
      return data.item;
    },

    async deleteManualShoppingItem(weekStart, itemId, signal) {
      await request(
        `/api/weeks/${encodeURIComponent(weekStart)}/shopping-list/${encodeURIComponent(itemId)}`,
        z.object({ deleted: z.literal(true) }),
        { method: "DELETE", signal },
      );
    },
  };
}

export const plannerClient = createHttpPlannerClient();
