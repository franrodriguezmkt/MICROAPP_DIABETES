import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { RecipeCatalogPage } from "../features/recipes/RecipeCatalogPage";
import { RecipeDetailPage } from "../features/recipes/RecipeDetailPage";
import { WeekPage } from "../features/planner/WeekPage";
import { ShoppingPage } from "../features/shopping/ShoppingPage";
import { AccessPage } from "../features/access/AccessPage";
import { VerifyAccessPage } from "../features/access/VerifyAccessPage";

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
  { path: "/activar", element: <AccessPage /> },
  { path: "/verificar", element: <VerifyAccessPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/semana" replace /> },
      { path: "recetas", element: <RecipeCatalogPage /> },
      { path: "recetas/:slug", element: <RecipeDetailPage /> },
      { path: "semana", element: <WeekPage /> },
      { path: "compras", element: <ShoppingPage /> },
      { path: "recursos", element: <ComingSoon title="Recursos" /> },
      { path: "cuenta", element: <ComingSoon title="Tu cuenta" /> },
    ],
  },
]);
