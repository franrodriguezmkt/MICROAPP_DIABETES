import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function PrivateRoute() {
  const location = useLocation();
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="access-page">
        <p className="access-message access-message--success" role="status">
          Verificando tu acceso…
        </p>
      </main>
    );
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to="/activar"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (status === "inactive" && location.pathname !== "/cuenta") {
    return <Navigate to="/cuenta?estado=inactivo" replace />;
  }

  if (status === "error") {
    return (
      <main className="access-page">
        <p className="access-message access-message--error" role="alert">
          No pudimos verificar tu acceso. Recarga la página para intentarlo de
          nuevo.
        </p>
      </main>
    );
  }

  return <Outlet />;
}
