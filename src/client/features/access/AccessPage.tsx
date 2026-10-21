import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";
import {
  getBrowserAuthClient,
  type AuthClient,
} from "../../lib/authClient";

type AccessPageProps = {
  client?: AuthClient;
};

export function AccessPage({ client }: AccessPageProps) {
  const navigate = useNavigate();
  const auth = client ?? getBrowserAuthClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.requestOtp(email);
      navigate("/verificar");
    } catch {
      setError("No pudimos enviar el código. Espera un momento e intenta otra vez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <header className="access-card__header">
          <BrandMark className="access-card__mark brand-mark" />
          <div>
            <p className="eyebrow">Mi semana de recetas</p>
            <h1 id="access-title">Activa tu acceso</h1>
          </div>
        </header>

        <p className="access-card__intro">
          Escribe el mismo correo que utilizaste al comprar en Hotmart. Te
          enviaremos un código temporal para comprobar que el correo es tuyo.
        </p>

        <form className="access-form" onSubmit={submit}>
          <label htmlFor="purchase-email">Correo usado en Hotmart</label>
          <input
            id="purchase-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={submitting}
          />
          {error ? (
            <p ref={errorRef} className="access-message access-message--error" role="alert" tabIndex={-1}>
              {error}
            </p>
          ) : null}
          <button className="access-button" type="submit" disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar código"}
          </button>
        </form>

        <p className="access-card__privacy">
          Por seguridad, el mensaje será el mismo aunque el correo no tenga una
          compra activa.
        </p>
        <nav className="access-legal" aria-label="Información legal">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
          <Link to="/aviso-educativo">Aviso educativo</Link>
        </nav>
      </section>
    </main>
  );
}
