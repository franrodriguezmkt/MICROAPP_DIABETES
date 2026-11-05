import { useState } from "react";

import type {
  ShoppingCategory,
  ShoppingListItem,
} from "../../../domain/planner/planner";
import { ingredientUnits, type IngredientUnit } from "../../../domain/recipes/recipe";
import { formatShoppingQuantity } from "../../../domain/planner/buildShoppingList";
import type { ShoppingItemPatch } from "../../lib/plannerClient";

type ShoppingGroupProps = {
  category: ShoppingCategory;
  title: string;
  items: ShoppingListItem[];
  onToggle: (item: ShoppingListItem) => void;
  onEdit: (item: ShoppingListItem, patch: ShoppingItemPatch) => void;
  onDelete: (item: ShoppingListItem) => void;
};

const unitLabels: Record<IngredientUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  unit: "unidades",
  tbsp: "cucharadas",
  tsp: "cucharaditas",
  cup: "tazas",
  pinch: "pizcas",
  to_taste: "al gusto",
};

export function quantityLabel(item: ShoppingListItem) {
  if (item.source === "generated") {
    if (item.quantity === null) return "Al gusto";
    const suffix = item.includesToTaste ? " + al gusto" : "";
    return `Aprox. ${formatShoppingQuantity(item.quantity)} ${unitLabels[item.unit]}${suffix}`;
  }
  if (item.quantity === undefined) return "Agregado por ti";
  return `${formatShoppingQuantity(item.quantity)}${item.unitLabel ? ` ${item.unitLabel}` : ""}`;
}

export function ShoppingGroup({
  category,
  title,
  items,
  onToggle,
  onEdit,
  onDelete,
}: ShoppingGroupProps) {
  const headingId = `shopping-group-${category}`;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("");
  const [draftUnit, setDraftUnit] = useState<IngredientUnit>("unit");
  const [draftUnitLabel, setDraftUnitLabel] = useState("");

  function beginEdit(item: ShoppingListItem) {
    setDraftLabel(item.label);
    setDraftQuantity(
      item.quantity === null || item.quantity === undefined
        ? ""
        : String(item.quantity),
    );
    if (item.source === "generated") setDraftUnit(item.unit);
    if (item.source === "manual") setDraftUnitLabel(item.unitLabel ?? "");
    setEditingId(item.id);
  }

  function submitEdit(item: ShoppingListItem) {
    const label = draftLabel.trim();
    if (!label) return;
    if (item.source === "generated") {
      const quantity = draftUnit === "to_taste" ? null : Number(draftQuantity);
      if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) return;
      onEdit(item, { label, quantity, unit: draftUnit });
    } else {
      const patch: ShoppingItemPatch = { label };
      if (draftQuantity.trim()) patch.quantity = Number(draftQuantity);
      if (draftUnitLabel.trim()) patch.unitLabel = draftUnitLabel.trim();
      onEdit(item, patch);
    }
    setEditingId(null);
  }

  return (
    <section className="shopping-group" aria-labelledby={headingId} role="region">
      <h2 id={headingId}>{title}</h2>
      <ul className="shopping-list">
        {items.map((item) => (
          <li
            className={`shopping-item${item.checked ? " shopping-item--checked" : ""}`}
            key={item.id}
          >
            {editingId === item.id ? (
              <form
                className="shopping-item__edit"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitEdit(item);
                }}
              >
                <label className="shopping-item__field shopping-item__field--name">
                  <span>Producto</span>
                  <input
                    className="planner-input planner-control"
                    aria-label={`Editar ${item.label}`}
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                  />
                </label>
                <label className="shopping-item__field">
                  <span>Cantidad</span>
                  <input
                    className="planner-input planner-control"
                    type="number"
                    min="0.01"
                    step="any"
                    aria-label={`Cantidad de ${item.label}`}
                    value={draftQuantity}
                    disabled={item.source === "generated" && draftUnit === "to_taste"}
                    onChange={(event) => setDraftQuantity(event.target.value)}
                  />
                </label>
                {item.source === "generated" ? (
                  <label className="shopping-item__field">
                    <span>Unidad</span>
                    <select
                      className="planner-select planner-control"
                      aria-label={`Unidad de ${item.label}`}
                      value={draftUnit}
                      onChange={(event) =>
                        setDraftUnit(event.target.value as IngredientUnit)
                      }
                    >
                      {ingredientUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unitLabels[unit]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="shopping-item__field">
                    <span>Unidad</span>
                    <input
                      className="planner-input planner-control"
                      aria-label={`Unidad de ${item.label}`}
                      value={draftUnitLabel}
                      placeholder="paquetes"
                      onChange={(event) => setDraftUnitLabel(event.target.value)}
                    />
                  </label>
                )}
                <div className="shopping-item__edit-actions">
                  <button
                    className="planner-button planner-control"
                    type="submit"
                    aria-label={`Guardar ${item.label}`}
                  >
                    Guardar
                  </button>
                  <button
                    className="planner-button planner-button--quiet planner-control"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <label className="shopping-item__check">
                  <input
                    className="planner-control"
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => onToggle(item)}
                    aria-label={`${item.label}, ${quantityLabel(item)}`}
                  />
                  <span className="shopping-item__copy">
                    <strong>{item.label}</strong>
                    <small>{quantityLabel(item)}</small>
                  </span>
                </label>
                <div className="shopping-item__actions">
                  <button
                    className="shopping-item__action planner-control"
                    type="button"
                    onClick={() => beginEdit(item)}
                    aria-label={`Editar ${item.label}`}
                  >
                    Editar
                  </button>
                  <button
                    className="shopping-item__action shopping-item__action--danger planner-control"
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`${item.source === "generated" ? "Quitar" : "Eliminar"} ${item.label}`}
                  >
                    {item.source === "generated" ? "Quitar" : "Eliminar"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
