import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { RecipeCatalogPage } from "../features/recipes/RecipeCatalogPage";
import { RecipeDetailPage } from "../features/recipes/RecipeDetailPage";

function ComingSoon({ title }: { title: string }) {
  return (
    <section className="page-section" aria-labelledby="coming-soon-title">
      <EmptyState
        title={`${title} está en preparación`}
        description="Esta sección se habilitará en el siguiente incremento del producto."
        headingId="coming-soon-title"
      />
    </section>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/recetas" replace /> },
      { path: "recetas", element: <RecipeCatalogPage /> },
      { path: "recetas/:slug", element: <RecipeDetailPage /> },
      { path: "semana", element: <ComingSoon title="Tu semana" /> },
      { path: "compras", element: <ComingSoon title="Lista de compras" /> },
      { path: "recursos", element: <ComingSoon title="Recursos" /> },
      { path: "cuenta", element: <ComingSoon title="Tu cuenta" /> },
    ],
  },
]);
