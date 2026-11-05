import { describe, expect, it } from "vitest";

import {
  savedWeekSummarySchema,
  savedWeekTitleSchema,
} from "../../src/domain/planner/planner";

describe("saved week domain", () => {
  it("trims a visible title between one and sixty characters", () => {
    expect(savedWeekTitleSchema.parse("  Semana familiar  ")).toBe(
      "Semana familiar",
    );
    expect(() => savedWeekTitleSchema.parse("   ")).toThrow();
    expect(() => savedWeekTitleSchema.parse("a".repeat(61))).toThrow();
  });

  it("validates the summary returned to the library", () => {
    expect(
      savedWeekSummarySchema.parse({
        weekStart: "2026-11-09",
        title: "Semana del 9 al 15 de noviembre",
        savedAt: "2026-11-05T20:00:00.000Z",
        people: 2,
        mealCount: 28,
        previewRecipeId: "recipe-breakfast-01",
      }),
    ).toEqual({
      weekStart: "2026-11-09",
      title: "Semana del 9 al 15 de noviembre",
      savedAt: "2026-11-05T20:00:00.000Z",
      people: 2,
      mealCount: 28,
      previewRecipeId: "recipe-breakfast-01",
    });
  });
});
