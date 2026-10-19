import { useMemo, useState, type FormEvent } from "react";

import type { IngredientCatalogEntry } from "../../../domain/ingredients/ingredientCatalog";
import {
  plannedMealTypes,
  type PlannedMealType,
  type PlannerPreferences,
} from "../../../domain/planner/planner";

type PreferencesFormProps = {
  ingredientCatalog: IngredientCatalogEntry[];
  initialPreferences?: PlannerPreferences;
  onSave: (preferences: PlannerPreferences) => void | Promise<void>;
  busy?: boolean;
  submitLabel?: string;
};

const mealLabels: Record<PlannedMealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

const defaultPreferences: PlannerPreferences = {
  people: 2,
  enabledMeals: [...plannedMealTypes],
  excludedIngredientIds: [],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function PreferencesForm({
  ingredientCatalog,
  initialPreferences = defaultPreferences,
  onSave,
  busy = false,
  submitLabel = "Organizar mi semana",
}: PreferencesFormProps) {
  const [peopleInput, setPeopleInput] = useState(
    String(initialPreferences.people),
  );
  const [enabledMeals, setEnabledMeals] = useState<PlannedMealType[]>(
    initialPreferences.enabledMeals,
  );
  const [excludedIngredientIds, setExcludedIngredientIds] = useState<string[]>(
    initialPreferences.excludedIngredientIds,
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const visibleIngredients = useMemo(() => {
    const query = normalize(search.trim());
    return ingredientCatalog.filter(
      (ingredient) => !query || normalize(ingredient.label).includes(query),
    );
  }, [ingredientCatalog, search]);

  function toggleMeal(meal: PlannedMealType) {
    setEnabledMeals((current) =>
      current.includes(meal)
        ? current.filter((candidate) => candidate !== meal)
        : plannedMealTypes.filter(
            (candidate) => current.includes(candidate) || candidate === meal,
          ),
    );
  }

  function toggleIngredient(ingredientId: string) {
    setExcludedIngredientIds((current) =>
      current.includes(ingredientId)
        ? current.filter((candidate) => candidate !== ingredientId)
        : [...current, ingredientId],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (enabledMeals.length === 0) {
      setError("Elige al menos un momento de comida para organizar la semana.");
      return;
    }
    setError(null);
    const people = Math.min(12, Math.max(1, Number(peopleInput) || 1));
    setPeopleInput(String(people));
    await onSave({ people, enabledMeals, excludedIngredientIds });
  }

  return (
    <form className="preferences-form" onSubmit={submit}>
      <div className="preferences-form__field">
        <label htmlFor="planner-people">¿Para cuántas personas?</label>
        <input
          className="planner-input planner-control"
          id="planner-people"
          type="number"
          min="1"
          max="12"
          value={peopleInput}
          onChange={(event) => setPeopleInput(event.target.value)}
        />
      </div>

      <fieldset className="preferences-form__fieldset">
        <legend>Momentos que quieres planificar</legend>
        <div className="meal-choice-grid">
          {plannedMealTypes.map((meal) => (
            <label className="meal-choice" key={meal}>
              <input
                className="planner-control"
                type="checkbox"
                checked={enabledMeals.includes(meal)}
                onChange={() => toggleMeal(meal)}
              />
              <span>{mealLabels[meal]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="preferences-form__fieldset">
        <legend>Ingredientes que prefieres evitar</legend>
        <label className="preferences-form__search">
          <span>Buscar ingrediente</span>
          <input
            className="planner-input planner-control"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej.: maní, tomate…"
          />
        </label>
        <div className="ingredient-choice-list">
          {visibleIngredients.slice(0, 24).map((ingredient) => (
            <label className="ingredient-choice" key={ingredient.ingredientId}>
              <input
                className="planner-control"
                type="checkbox"
                checked={excludedIngredientIds.includes(ingredient.ingredientId)}
                onChange={() => toggleIngredient(ingredient.ingredientId)}
              />
              <span>{ingredient.label}</span>
            </label>
          ))}
          {visibleIngredients.length === 0 ? (
            <p className="planner-muted">No encontramos ese ingrediente.</p>
          ) : null}
        </div>
      </fieldset>

      {error ? <p role="alert" className="planner-error">{error}</p> : null}
      <button className="planner-button planner-control" type="submit" disabled={busy}>
        {busy ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
