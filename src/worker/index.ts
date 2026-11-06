import rawIngredientCatalog from "../../content/ingredients/catalog.json";
import recipes from "virtual:recipe-content";

import { ingredientCatalogSchema } from "../domain/ingredients/ingredientCatalog";
import { InMemoryPlannerRepository } from "../infrastructure/planner/InMemoryPlannerRepository";
import { createWorkerApp } from "./app";

const plannerPreview = import.meta.env.DEV;
const ingredientCatalog = ingredientCatalogSchema.parse(rawIngredientCatalog);

export default createWorkerApp(
  plannerPreview
    ? {
        plannerPreview: true,
        repository: new InMemoryPlannerRepository(),
        recipes,
        ingredientCatalog,
        previewUserId: "local-preview-user",
      }
    : {
        plannerPreview: false,
        recipes,
        ingredientCatalog,
      },
);
