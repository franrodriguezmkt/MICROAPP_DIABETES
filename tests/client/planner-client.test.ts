import { describe, expect, it, vi } from "vitest";

import { createHttpPlannerClient } from "../../src/client/lib/plannerClient";
import type { AuthClient } from "../../src/client/lib/authClient";

const savedWeek = {
  weekStart: "2026-10-19",
  title: "Semana familiar",
  savedAt: "2026-11-05T20:00:00.000Z",
  people: 2,
  mealCount: 28,
  previewRecipeId: "breakfast-1",
};

function authClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ access_token: "token" }),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  } as unknown as Pick<AuthClient, "getSession" | "refreshSession" | "signOut">;
}

describe("planner saved weeks HTTP client", () => {
  it("uses the saved-weeks endpoints and validates their responses", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/saved-weeks" && !init?.method) {
        return Response.json({ data: { weeks: [savedWeek] } });
      }
      if (path === "/api/weeks/2026-10-19/save") {
        return Response.json({ data: { week: savedWeek } });
      }
      if (path === "/api/saved-weeks/2026-10-19" && init?.method === "PATCH") {
        return Response.json({
          data: { week: { ...savedWeek, title: "Semana renovada" } },
        });
      }
      if (path === "/api/saved-weeks/2026-10-19" && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request ${init?.method ?? "GET"} ${path}`);
    }) as unknown as typeof fetch;
    const client = createHttpPlannerClient(fetcher, authClient());

    await expect(client.listSavedWeeks()).resolves.toEqual([savedWeek]);
    await expect(
      client.saveWeekToLibrary("2026-10-19", "Semana familiar"),
    ).resolves.toEqual(savedWeek);
    await expect(
      client.renameSavedWeek("2026-10-19", "Semana renovada"),
    ).resolves.toMatchObject({ title: "Semana renovada" });
    await expect(client.deleteSavedWeek("2026-10-19")).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/weeks/2026-10-19/save",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Semana familiar" }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "/api/saved-weeks/2026-10-19",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "/api/saved-weeks/2026-10-19",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
