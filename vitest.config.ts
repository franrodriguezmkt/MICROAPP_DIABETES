import { defineConfig } from "vitest/config";

import rawRecipes from "./content/recipes/recipes.json" with { type: "json" };
import { recipeContentPlugin } from "./build/recipeContent.ts";

export default defineConfig(({ mode }) => ({
  plugins: [recipeContentPlugin(rawRecipes, mode)],
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
}));
