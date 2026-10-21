import { Link } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";
import { parseHotmartCheckoutUrl } from "../../lib/checkout";

type LandingPageProps = {
  checkoutUrl?: string | null;
};

const benefits = [
  "Una semana organizada con desayuno, almuerzo, cena y snack.",
  "Una lista de compras que se recalcula cuando cambias una receta.",
  "Recetas para planificar sin empezar de cero cada día.",
  "Preferencias, porciones y compras guardadas en tu cuenta.",
];

const questions = [
  {
    question: "¿Necesito instalar una aplicación?",
    answer:
      "No. Abres Mi semana de recetas desde el navegador del teléfono o de la computadora y puedes agregarla a tu pantalla de inicio.",
  },
  {
    question: "¿Cómo recibo el acceso?",
    answer:
      "Después de comprar, usas el mismo correo de Hotmart. Te enviamos un código temporal y no necesitas buscar ningún código de transacción.",
  },
  {
    question: "¿Puedo cambiar una receta?",
    answer:
      "Sí. Puedes sustituir una comida sin desarmar el resto de la semana, y la lista de compras se actualiza con el cambio.",
  },
  {
    question: "¿Esto reemplaza a mi médico o nutricionista?",
    answer:
      "No. Es una herramienta educativa de organización y recetas. No diagnostica, prescribe ni sustituye indicaciones profesionales personalizadas.",
  },
];

function PurchaseAction({ checkoutUrl }: { checkoutUrl: string | null }) {
  if (!checkoutUrl) {
    return (
      <p className="landing-purchase-status" role="status">
        Compra disponible próximamente. Estamos terminando la configuración
        segura del checkout.
      </p>
    );
  }

  return (
    <a
      className="landing-button landing-button--primary"
      href={checkoutUrl}
      rel="noreferrer"
    >
      Quiero mi acceso
    </a>
  );
}

export function LandingPage({ checkoutUrl }: LandingPageProps) {
  const configuredCheckout = parseHotmartCheckoutUrl(
    checkoutUrl === undefined
      ? import.meta.env.VITE_HOTMART_CHECKOUT_URL
      : checkoutUrl,
  );

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Mi semana de recetas">
          <BrandMark className="landing-brand__mark" />
          <span>Mi semana de recetas</span>
        </Link>
        <Link className="landing-existing-user" to="/activar">
          Ya compré: activar acceso
        </Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <p className="eyebrow">Menos decisiones. Más organización.</p>
            <h1 id="landing-title">
              Organiza tus recetas, tu semana y tus compras en un solo lugar
            </h1>
            <p className="landing-hero__lead">
              Elige tus preferencias, recibe una semana completa y lleva al
              supermercado una lista que ya reúne lo que vas a necesitar.
            </p>
            <div className="landing-hero__actions">
              <PurchaseAction checkoutUrl={configuredCheckout} />
              <a className="landing-text-link" href="#como-funciona">
                Ver cómo funciona
              </a>
            </div>
          </div>

          <div className="landing-preview" aria-label="Ejemplo de una semana organizada">
            <p className="landing-preview__kicker">Tu semana</p>
            <h2>Lunes sin improvisar</h2>
            <div className="landing-preview__meal">
              <span>Desayuno</span>
              <strong>Avena con manzana y canela</strong>
            </div>
            <div className="landing-preview__meal">
              <span>Almuerzo</span>
              <strong>Pollo al limón con vegetales</strong>
            </div>
            <div className="landing-preview__meal">
              <span>Snack</span>
              <strong>Yogur con nueces</strong>
            </div>
            <p className="landing-preview__footer">La compra se actualiza contigo.</p>
          </div>
        </section>

        <section className="landing-section landing-demo" aria-labelledby="week-demo-title">
          <div>
            <p className="eyebrow">Plan semanal</p>
            <h2 id="week-demo-title">Una semana lista para seguir</h2>
            <p>
              Desayuno, almuerzo, cena y snack organizados por día. Cambia una
              receta o ajusta las porciones sin perder el resto de tu plan.
            </p>
          </div>
          <div className="landing-week-strip" aria-hidden="true">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
              <span key={day} className={index === 0 ? "is-active" : undefined}>
                {day}
              </span>
            ))}
          </div>
        </section>

        <section className="landing-section landing-demo landing-demo--reverse" aria-labelledby="shopping-demo-title">
          <div>
            <p className="eyebrow">Lista automática</p>
            <h2 id="shopping-demo-title">Una compra más clara</h2>
            <p>
              Los ingredientes se agrupan para que marques lo que ya tienes,
              agregues productos manuales y compres con menos olvidos.
            </p>
          </div>
          <ul className="landing-shopping-card" aria-label="Ejemplo de lista de compras">
            <li><span aria-hidden="true">✓</span> Vegetales y frutas</li>
            <li><span aria-hidden="true">✓</span> Proteínas</li>
            <li><span aria-hidden="true">✓</span> Despensa</li>
          </ul>
        </section>

        <section className="landing-section" aria-labelledby="recipes-title">
          <p className="eyebrow">Biblioteca organizada</p>
          <h2 id="recipes-title">Recetas para cada momento</h2>
          <div className="landing-categories">
            {['Desayunos', 'Almuerzos', 'Cenas', 'Snacks', 'Postres'].map((category) => (
              <article key={category}>
                <span className="landing-category__motif" aria-hidden="true" />
                <h3>{category}</h3>
                <p>Ideas claras, ingredientes y preparación paso a paso.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-includes" aria-labelledby="includes-title">
          <div>
            <p className="eyebrow">Acceso completo</p>
            <h2 id="includes-title">Todo lo que incluye</h2>
          </div>
          <ul>
            {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
        </section>

        <section id="como-funciona" className="landing-section" aria-labelledby="how-title">
          <p className="eyebrow">Tres pasos</p>
          <h2 id="how-title">Cómo funciona</h2>
          <ol className="landing-steps">
            <li><strong>Compra en Hotmart.</strong><span>Tu correo recibe el permiso de acceso.</span></li>
            <li><strong>Activa tu cuenta.</strong><span>Escribe ese correo y confirma el código temporal.</span></li>
            <li><strong>Organiza tu semana.</strong><span>Selecciona tus preferencias y genera tu primera lista.</span></li>
          </ol>
        </section>

        <aside className="landing-notice" aria-label="Aviso educativo">
          <strong>Una herramienta para organizarte, no para diagnosticarte.</strong>
          <p>
            El contenido es educativo y no reemplaza la evaluación, el tratamiento
            ni las indicaciones de profesionales de la salud.
          </p>
          <Link to="/aviso-educativo">Leer el aviso educativo completo</Link>
        </aside>

        <section className="landing-section" aria-labelledby="faq-title">
          <p className="eyebrow">Antes de empezar</p>
          <h2 id="faq-title">Preguntas frecuentes</h2>
          <div className="landing-faq">
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="eyebrow">Tu próxima semana puede empezar hoy</p>
          <h2 id="final-cta-title">Planifica una vez. Compra con claridad.</h2>
          <PurchaseAction checkoutUrl={configuredCheckout} />
        </section>
      </main>

      <footer className="landing-footer">
        <span>Mi semana de recetas</span>
        <nav aria-label="Información legal">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
          <Link to="/aviso-educativo">Aviso educativo</Link>
        </nav>
      </footer>
    </div>
  );
}
