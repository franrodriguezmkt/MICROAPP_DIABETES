import type { RecipeCategory } from "../../../domain/recipes/recipe";

type RecipeFiltersProps = {
  search: string;
  category: RecipeCategory | "";
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: RecipeCategory | "") => void;
};

const categoryOptions: ReadonlyArray<{
  value: RecipeCategory | "";
  label: string;
}> = [
  { value: "", label: "Todas" },
  { value: "breakfast", label: "Desayunos" },
  { value: "lunch", label: "Almuerzos" },
  { value: "dinner", label: "Cenas" },
  { value: "snack", label: "Snacks" },
  { value: "dessert", label: "Postres" },
];

export function RecipeFilters({
  search,
  category,
  onSearchChange,
  onCategoryChange,
}: RecipeFiltersProps) {
  return (
    <div className="recipe-filters" aria-label="Filtros de recetas">
      <div className="field field--search">
        <label htmlFor="recipe-search">Buscar recetas</label>
        <input
          id="recipe-search"
          type="search"
          value={search}
          placeholder="Nombre o ingrediente"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div
        className="recipe-category-chips"
        role="group"
        aria-label="Categorías de recetas"
      >
        {categoryOptions.map((option) => (
          <button
            key={option.value || "all"}
            className="recipe-category-chip"
            type="button"
            aria-pressed={category === option.value}
            onClick={() => onCategoryChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
