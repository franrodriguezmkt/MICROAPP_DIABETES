import type {
  ShoppingCategory,
  ShoppingListItem,
} from "../../../domain/planner/planner";
import { formatShoppingQuantity } from "../../../domain/planner/buildShoppingList";

type ShoppingGroupProps = {
  category: ShoppingCategory;
  title: string;
  items: ShoppingListItem[];
  onToggle: (item: ShoppingListItem) => void;
  onEdit: (
    item: Extract<ShoppingListItem, { source: "manual" }>,
    label: string,
  ) => void;
  onDelete: (item: Extract<ShoppingListItem, { source: "manual" }>) => void;
};

const unitLabels = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  unit: "unidades",
  tbsp: "cucharadas",
  tsp: "cucharaditas",
  cup: "tazas",
  pinch: "pizcas",
  to_taste: "",
} as const;

function quantityLabel(item: ShoppingListItem) {
  if (item.source === "generated") {
    if (item.quantity === null) return "Al gusto";
    return `${formatShoppingQuantity(item.quantity)} ${unitLabels[item.unit]}`;
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

  return (
    <section className="shopping-group" aria-labelledby={headingId} role="region">
      <h2 id={headingId}>{title}</h2>
      <ul className="shopping-list">
        {items.map((item) => (
          <li className={`shopping-item${item.checked ? " shopping-item--checked" : ""}`} key={item.id}>
            {item.source === "manual" && editingId === item.id ? (
              <form
                className="shopping-item__edit"
                onSubmit={(event) => {
                  event.preventDefault();
                  const cleanLabel = draftLabel.trim();
                  if (!cleanLabel) return;
                  onEdit(item, cleanLabel);
                  setEditingId(null);
                }}
              >
                <label>
                  <span className="visually-hidden">Editar {item.label}</span>
                  <input
                    className="planner-input planner-control"
                    aria-label={`Editar ${item.label}`}
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                  />
                </label>
                <button
                  className="planner-button planner-control"
                  type="submit"
                  aria-label={`Guardar ${item.label}`}
                >
                  Guardar
                </button>
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
            {item.source === "manual" ? (
              <div className="shopping-item__actions">
                <button
                  className="shopping-item__delete planner-control"
                  type="button"
                  onClick={() => {
                    setDraftLabel(item.label);
                    setEditingId(item.id);
                  }}
                  aria-label={`Editar ${item.label}`}
                >
                  Editar
                </button>
                <button
                  className="shopping-item__delete planner-control"
                  type="button"
                  onClick={() => onDelete(item)}
                  aria-label={`Eliminar ${item.label}`}
                >
                  Eliminar
                </button>
              </div>
            ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
import { useState } from "react";

