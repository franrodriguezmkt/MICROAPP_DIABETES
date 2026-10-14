import type { RecipeCategory } from "../../../domain/recipes/recipe";

type RecipeFiltersProps = {
  search: string;
  category: RecipeCategory | "";
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: RecipeCategory | "") => void;
};

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
      <div className="field field--category">
        <label htmlFor="recipe-category">Categoría</label>
        <select
          id="recipe-category"
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as RecipeCategory | "")
          }
        >
          <option value="">Todas</option>
          <option value="breakfast">Desayunos</option>
          <option value="lunch">Almuerzos</option>
          <option value="dinner">Cenas</option>
          <option value="snack">Snacks</option>
          <option value="dessert">Postres</option>
        </select>
      </div>
    </div>
  );
}
