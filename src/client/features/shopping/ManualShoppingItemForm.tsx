import { useState, type FormEvent } from "react";

import type { ManualShoppingItemInput } from "../../lib/plannerClient";

type ManualShoppingItemFormProps = {
  onAdd: (input: ManualShoppingItemInput) => void | Promise<void>;
  busy?: boolean;
};

export function ManualShoppingItemForm({
  onAdd,
  busy = false,
}: ManualShoppingItemFormProps) {
  const [label, setLabel] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    await onAdd({ label: cleanLabel, category: "other" });
    setLabel("");
  }

  return (
    <form className="manual-shopping-form" onSubmit={submit}>
      <label>
        <span>Nuevo producto</span>
        <input
          className="planner-input planner-control"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ej.: servilletas"
        />
      </label>
      <button
        className="planner-button planner-control"
        type="submit"
        disabled={busy || !label.trim()}
      >
        Agregar producto
      </button>
    </form>
  );
}
