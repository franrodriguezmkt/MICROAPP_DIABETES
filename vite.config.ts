import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

import rawRecipes from "./content/recipes/recipes.json" with { type: "json" };
import rawResources from "./content/resources/resources.json" with { type: "json" };
import { recipeContentPlugin } from "./build/recipeContent.ts";
import { resourceContentPlugin } from "./build/resourceContent.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    recipeContentPlugin(rawRecipes, mode),
    resourceContentPlugin(rawResources, resolve("public")),
    react(),
    cloudflare(),
  ],
}));
