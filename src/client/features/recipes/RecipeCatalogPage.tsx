import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  recipeCategories,
  type Recipe,
  type RecipeCategory,
} from "../../../domain/recipes/recipe";
import type { RecipeRepository } from "../../../domain/recipes/recipeRepository";
import { EmptyState } from "../../components/EmptyState";
import { RecipeCard } from "../../components/RecipeCard";
import { recipeRepository } from "../../lib/content";
import { RecipeFilters } from "./RecipeFilters";

function parseCategory(value: string | null): RecipeCategory | "" {
  return recipeCategories.includes(value as RecipeCategory)
    ? (value as RecipeCategory)
    : "";
}

export function RecipeCatalogPage({
  repository = recipeRepository,
}: {
  repository?: RecipeRepository;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const category = parseCategory(searchParams.get("category"));
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void repository
      .list({ search, category: category || undefined, includeDrafts: true })
      .then((nextRecipes) => {
        if (active) {
          setRecipes(nextRecipes);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, repository, search]);

  function updateParam(name: "q" | "category", value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    });
  }

  const hasFilters = Boolean(search.trim() || category);

  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <header className="catalog-hero">
        <p className="eyebrow">Biblioteca</p>
        <h1 id="catalog-title">Recetas para hacer tu semana más simple</h1>
        <p>
          Busca por nombre o ingrediente y guarda tus ideas para organizar el menú.
        </p>
      </header>

      <RecipeFilters
        search={search}
        category={category}
        onSearchChange={(value) => updateParam("q", value)}
        onCategoryChange={(value) => updateParam("category", value)}
      />

      <div className="catalog-status" aria-live="polite">
        {loading
          ? "Cargando recetas…"
          : `${recipes.length} ${recipes.length === 1 ? "receta" : "recetas"}`}
      </div>

      {!loading && recipes.length > 0 ? (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : null}

      {!loading && recipes.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No encontramos recetas con esos filtros"
            description="Prueba otra palabra o vuelve a ver todas las categorías."
          />
        ) : (
          <EmptyState
            title="Estamos revisando las recetas"
            description="La biblioteca aparecerá aquí cuando termine la revisión profesional del contenido."
          />
        )
      ) : null}
    </section>
  );
}
