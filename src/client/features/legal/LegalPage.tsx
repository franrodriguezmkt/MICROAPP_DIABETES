import { Link } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";

export type LegalPageType = "privacy" | "terms" | "educational";

type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

const content: Record<LegalPageType, LegalContent> = {
  privacy: {
    eyebrow: "Tus datos y tu acceso",
    title: "Política de privacidad",
    intro:
      "Esta política explica qué datos utiliza Mi semana de recetas para dar acceso al producto, guardar tu organización y mantener la seguridad del servicio.",
    sections: [
      {
        title: "Datos que utilizamos",
        paragraphs: [
          "Tratamos el correo utilizado para activar el acceso, el estado de la compra, tus preferencias, tus planes semanales, tus listas de compras y los datos técnicos mínimos necesarios para seguridad y diagnóstico de errores.",
        ],
      },
      {
        title: "Para qué los utilizamos",
        paragraphs: [
          "Usamos estos datos para verificar el acceso adquirido, iniciar tu sesión, generar y conservar tu semana, recalcular tu compra, responder solicitudes de soporte y prevenir abusos.",
          "No vendemos tus datos personales ni los utilizamos para diagnóstico médico o publicidad basada en información de salud.",
        ],
      },
      {
        title: "Servicios que participan",
        paragraphs: [
          "Cloudflare, Supabase, Hotmart y el proveedor de correo transaccional configurado procesan únicamente los datos necesarios para alojamiento, autenticación, cobro, permisos de compra y entrega del código de acceso.",
        ],
      },
      {
        title: "Conservación y seguridad",
        paragraphs: [
          "Conservamos la información mientras tu cuenta y las obligaciones relacionadas con la compra lo requieran. Después de una revocación o solicitud válida, se elimina o anonimiza conforme a las obligaciones aplicables y a los plazos operativos razonables.",
          "Las claves administrativas no se guardan en el navegador. Las operaciones privadas requieren una sesión válida y un acceso de compra activo.",
        ],
      },
      {
        title: "Tus decisiones",
        paragraphs: [
          "Puedes solicitar acceso, corrección o eliminación de tus datos mediante el canal de soporte informado en la página de venta. Algunas constancias mínimas de pago, seguridad o cumplimiento pueden conservarse cuando exista una obligación válida.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Condiciones del producto",
    title: "Términos de uso",
    intro:
      "Al utilizar Mi semana de recetas aceptas estas condiciones para el acceso digital, el contenido y las funciones de organización.",
    sections: [
      {
        title: "Acceso personal",
        paragraphs: [
          "El acceso es personal y está vinculado al correo utilizado en la compra. No debes compartir códigos de un solo uso, sesiones ni mecanismos destinados a evitar la validación de acceso.",
        ],
      },
      {
        title: "Compra y reembolsos",
        paragraphs: [
          "El pago y los reembolsos se procesan en Hotmart conforme a las condiciones mostradas en el checkout y a las normas aplicables. Un reembolso, contracargo o revocación puede desactivar el acceso a las funciones privadas.",
        ],
      },
      {
        title: "Uso permitido",
        paragraphs: [
          "Puedes utilizar las recetas, el planificador, la lista de compras y los recursos publicados para tu organización personal. No puedes revender, copiar masivamente, extraer automáticamente ni distribuir el contenido como producto propio.",
        ],
      },
      {
        title: "Disponibilidad y cambios",
        paragraphs: [
          "Podemos corregir errores, mejorar funciones, actualizar contenido y retirar temporalmente materiales que necesiten revisión. Procuraremos conservar tus datos de organización durante mantenimientos razonables, sin prometer disponibilidad ininterrumpida.",
        ],
      },
      {
        title: "Límite educativo",
        paragraphs: [
          "El producto ayuda a organizar recetas y compras. No presta atención médica, no prescribe tratamientos y no garantiza resultados de salud.",
        ],
      },
    ],
  },
  educational: {
    eyebrow: "Uso responsable",
    title: "Aviso educativo",
    intro:
      "Mi semana de recetas es una herramienta digital de recetas y organización semanal; no es una aplicación de seguimiento clínico.",
    sections: [
      {
        title: "No sustituye atención profesional",
        paragraphs: [
          "El contenido es general y educativo. No reemplaza una consulta, un diagnóstico, un tratamiento ni una indicación profesional personalizada.",
        ],
      },
      {
        title: "Adapta el contenido a tu situación",
        paragraphs: [
          "Antes de cambiar tu alimentación o actividad física, considera alergias, intolerancias, medicamentos, objetivos indicados, otras condiciones y las recomendaciones de profesionales que conocen tu historia.",
        ],
      },
      {
        title: "Ingredientes y porciones",
        paragraphs: [
          "Las cantidades y sustituciones sirven para organizar la preparación. No constituyen un cálculo clínico individual de carbohidratos, calorías, insulina o medicación.",
        ],
      },
      {
        title: "Cuándo pedir ayuda",
        paragraphs: [
          "Si tienes síntomas, dudas sobre un tratamiento, restricciones especiales o una situación urgente, comunícate con un profesional de salud o con los servicios de emergencia disponibles en tu localidad.",
        ],
      },
    ],
  },
};

export function LegalPage({ type }: { type: LegalPageType }) {
  const page = content[type];

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" to="/" aria-label="Volver a Mi semana de recetas">
          <BrandMark className="legal-brand__mark" />
          <span>Mi semana de recetas</span>
        </Link>
        <Link className="legal-access-link" to="/activar">
          Activar acceso
        </Link>
      </header>

      <main className="legal-main">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p className="legal-intro">{page.intro}</p>
        <p className="legal-updated">Última actualización: 21 de octubre de 2026</p>

        <div className="legal-sections">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <nav className="legal-related" aria-label="Otras páginas legales">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
          <Link to="/aviso-educativo">Aviso educativo</Link>
        </nav>
      </main>
    </div>
  );
}
