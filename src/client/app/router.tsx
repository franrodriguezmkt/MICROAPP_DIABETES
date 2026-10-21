import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { RecipeCatalogPage } from "../features/recipes/RecipeCatalogPage";
import { RecipeDetailPage } from "../features/recipes/RecipeDetailPage";
import { WeekPage } from "../features/planner/WeekPage";
import { ShoppingPage } from "../features/shopping/ShoppingPage";
import { AccessPage } from "../features/access/AccessPage";
import { VerifyAccessPage } from "../features/access/VerifyAccessPage";
import { AuthProvider } from "../features/access/AuthProvider";
import { PrivateRoute } from "../features/access/PrivateRoute";
import { AccountPage } from "../features/account/AccountPage";
import { LandingPage } from "../features/landing/LandingPage";
import { ResourcesPage } from "../features/resources/ResourcesPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/activar", element: <AccessPage /> },
  { path: "/verificar", element: <VerifyAccessPage /> },
  {
    element: <AuthProvider />,
    children: [
      {
        element: <PrivateRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "recetas", element: <RecipeCatalogPage /> },
              { path: "recetas/:slug", element: <RecipeDetailPage /> },
              { path: "semana", element: <WeekPage /> },
              { path: "compras", element: <ShoppingPage /> },
              { path: "recursos", element: <ResourcesPage /> },
              { path: "cuenta", element: <AccountPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
