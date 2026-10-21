import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../access/AuthProvider";

export function AccountPage() {
  const navigate = useNavigate();
  const { status, user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function leave() {
    setError(null);
    setSubmitting(true);
    try {
      await signOut();
      navigate("/activar", { replace: true });
    } catch {
      setError("No pudimos cerrar la sesión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section account-page" aria-labelledby="account-title">
      <p className="eyebrow">Acceso y seguridad</p>
      <h1 id="account-title">Tu cuenta</h1>
      <div className="account-card">
        <p>
          <strong>Correo verificado</strong>
          <br />
          {user?.email ?? "Correo no disponible"}
        </p>
        <p>
          <strong>Estado del acceso</strong>
          <br />
          {status === "inactive" ? "Acceso inactivo" : "Acceso activo"}
        </p>
        {status === "inactive" ? (
          <p className="access-message access-message--error">
            Tu compra ya no tiene acceso activo. Si crees que es un error,
            comunícate con soporte usando el mismo correo de compra.
          </p>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <button
          className="access-button"
          type="button"
          onClick={leave}
          disabled={submitting}
        >
          {submitting ? "Cerrando…" : "Cerrar sesión"}
        </button>
        <nav className="account-legal" aria-label="Información legal">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
          <Link to="/aviso-educativo">Aviso educativo</Link>
        </nav>
      </div>
    </section>
  );
}
