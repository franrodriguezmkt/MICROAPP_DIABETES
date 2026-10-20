import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";
import {
  AuthClientError,
  getBrowserAuthClient,
  type AuthClient,
} from "../../lib/authClient";

type VerifyAccessPageProps = {
  client?: AuthClient;
};

export function VerifyAccessPage({ client }: VerifyAccessPageProps) {
  const navigate = useNavigate();
  const auth = client ?? getBrowserAuthClient();
  const [email] = useState(() => auth.getPendingEmail());
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!email) return <Navigate to="/activar" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (!/^\d{6}$/.test(token)) {
      setError("Escribe los seis dígitos del código.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await auth.verifyOtp(email!, token);
      navigate("/semana", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof AuthClientError && caught.code === "OTP_INVALID"
          ? "El código no es válido o ya venció."
          : "No pudimos verificar el código. Intenta nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    setStatus(null);
    setResending(true);
    try {
      await auth.requestOtp(email!);
      setStatus("Te enviamos un código nuevo.");
    } catch {
      setError("No pudimos reenviar el código. Espera un momento.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="verify-title">
        <header className="access-card__header">
          <BrandMark className="access-card__mark brand-mark" />
          <div>
            <p className="eyebrow">Acceso seguro</p>
            <h1 id="verify-title">Revisa tu correo</h1>
          </div>
        </header>

        <p className="access-card__intro">
          Escribe el código de seis dígitos enviado a <strong>{email}</strong>.
        </p>

        <form className="access-form" onSubmit={submit}>
          <label htmlFor="access-token">Código de seis dígitos</label>
          <input
            id="access-token"
            name="token"
            className="access-form__otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={token}
            onChange={(event) =>
              setToken(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={submitting}
          />
          {error ? (
            <p ref={errorRef} className="access-message access-message--error" role="alert" tabIndex={-1}>
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="access-message access-message--success" role="status">
              {status}
            </p>
          ) : null}
          <button className="access-button" type="submit" disabled={submitting}>
            {submitting ? "Verificando…" : "Confirmar acceso"}
          </button>
          <button
            className="access-button access-button--secondary"
            type="button"
            onClick={resend}
            disabled={resending}
          >
            {resending ? "Enviando…" : "Enviar otro código"}
          </button>
        </form>
      </section>
    </main>
  );
}
