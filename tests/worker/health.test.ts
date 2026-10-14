import { describe, expect, it } from "vitest";

import { createWorkerApp } from "../../src/worker/app";

describe("health endpoint", () => {
  it("returns the build-independent health contract", async () => {
    const response = await createWorkerApp().request(
      "http://local.test/api/health",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "recipe-app",
    });
  });
});
