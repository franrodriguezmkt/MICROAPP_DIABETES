import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

import rawRecipes from "./content/recipes/recipes.json" with { type: "json" };
import rawResources from "./content/resources/resources.json" with { type: "json" };
import { recipeContentPlugin } from "./build/recipeContent.ts";
import { resourceContentPlugin } from "./build/resourceContent.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    recipeContentPlugin(rawRecipes, mode),
    resourceContentPlugin(rawResources, resolve("public")),
  ],
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
}));
