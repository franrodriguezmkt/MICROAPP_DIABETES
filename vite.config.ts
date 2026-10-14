import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import rawRecipes from "./content/recipes/recipes.json" with { type: "json" };
import { recipeContentPlugin } from "./build/recipeContent.ts";

export default defineConfig(({ mode }) => ({
  plugins: [recipeContentPlugin(rawRecipes, mode), react(), cloudflare()],
}));
