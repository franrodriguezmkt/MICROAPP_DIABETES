import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type {
  ShoppingCategory,
  ShoppingListItem,
} from "../../../domain/planner/planner";
import {
  plannerClient,
  type ManualShoppingItemInput,
  type PlannerClient,
} from "../../lib/plannerClient";
import { mondayFor, weekStartFromSearch } from "../../lib/weekStart";
import { ManualShoppingItemForm } from "./ManualShoppingItemForm";
import { ShoppingGroup } from "./ShoppingGroup";

type ShoppingPageProps = {
  client?: PlannerClient;
  initialWeekStart?: string;
};

const categoryOrder: Array<{ category: ShoppingCategory; title: string }> = [
  { category: "produce", title: "Frutas y verduras" },
  { category: "protein", title: "Proteínas" },
  { category: "dairy", title: "Lácteos y alternativas" },
  { category: "bakery", title: "Panadería" },
  { category: "pantry", title: "Despensa" },
  { category: "frozen", title: "Congelados" },
  { category: "other", title: "Otros" },
];

export function ShoppingPage({
  client = plannerClient,
  initialWeekStart = mondayFor(),
}: ShoppingPageProps) {
  const [searchParams] = useSearchParams();
  const weekStart = weekStartFromSearch(searchParams, initialWeekStart);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  function nextLoadController() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller;
  }

  async function load() {
    const controller = nextLoadController();
    setState("loading");
    try {
      setItems(await client.getShoppingList(weekStart, controller.signal));
      setState("ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setState("error");
    }
  }

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
    // Reload when browser navigation selects another week.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function toggle(item: ShoppingListItem) {
    const optimistic = { ...item, checked: !item.checked } as ShoppingListItem;
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? optimistic : candidate,
      ),
    );
    setMessage("");
    try {
      const saved = await client.patchShoppingItem(
        weekStart,
        item.id,
        { checked: optimistic.checked },
        new AbortController().signal,
      );
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === saved.id ? saved : candidate,
        ),
      );
    } catch {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? item : candidate,
        ),
      );
      setMessage("No pudimos guardar el cambio. Recuperamos el estado anterior.");
    }
  }

  async function addManual(input: ManualShoppingItemInput) {
    setSaving(true);
    setMessage("");
    try {
      const item = await client.addManualShoppingItem(
        weekStart,
        input,
        new AbortController().signal,
      );
      setItems((current) => [...current, item]);
    } catch {
      setMessage("No pudimos agregar el producto. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteManual(
    item: Extract<ShoppingListItem, { source: "manual" }>,
  ) {
    setMessage("");
    try {
      await client.deleteManualShoppingItem(
        weekStart,
        item.id,
        new AbortController().signal,
      );
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
    } catch {
      setMessage("No pudimos eliminar el producto. Inténtalo de nuevo.");
    }
  }

  async function editManual(
    item: Extract<ShoppingListItem, { source: "manual" }>,
    label: string,
  ) {
    setMessage("");
    try {
      const saved = await client.patchShoppingItem(
        weekStart,
        item.id,
        { label },
        new AbortController().signal,
      );
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === saved.id ? saved : candidate,
        ),
      );
    } catch {
      setMessage("No pudimos editar el producto. Inténtalo de nuevo.");
    }
  }

  if (state === "loading") {
    return <section className="planner-state" aria-live="polite">Armando tu lista de compras…</section>;
  }

  if (state === "error") {
    return (
      <section className="planner-state" role="alert" aria-labelledby="shopping-error-title">
        <h1 id="shopping-error-title">No pudimos cargar tu lista</h1>
        <p>Revisa tu conexión y vuelve a intentarlo.</p>
        <button className="planner-button planner-control" type="button" onClick={() => void load()}>
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="planner-page shopping-page" aria-labelledby="shopping-title">
      <header className="planner-hero">
        <p className="eyebrow">Sale de tu menú semanal</p>
        <h1 id="shopping-title">Lista de compras</h1>
        <p>Marca lo que ya tienes y agrega cualquier producto extra.</p>
      </header>

      <ManualShoppingItemForm onAdd={addManual} busy={saving} />
      <div className="shopping-save-status" role="status" aria-live="polite">
        {message}
      </div>

      {items.length === 0 ? (
        <div className="shopping-empty">
          <h2>Organiza primero tu semana</h2>
          <p>Cuando tengas un menú, aquí aparecerán sus ingredientes.</p>
          <a className="planner-button planner-control" href={`/semana?week=${encodeURIComponent(weekStart)}`}>Ir a Semana</a>
        </div>
      ) : (
        <div className="shopping-groups">
          {categoryOrder.map(({ category, title }) => {
            const groupItems = items.filter((item) => item.category === category);
            return groupItems.length ? (
              <ShoppingGroup
                key={category}
                category={category}
                title={title}
                items={groupItems}
                onToggle={(item) => void toggle(item)}
                onEdit={(item, label) => void editManual(item, label)}
                onDelete={(item) => void deleteManual(item)}
              />
            ) : null;
          })}
        </div>
      )}
    </section>
  );
}
