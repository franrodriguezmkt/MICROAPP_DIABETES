import rawResources from "../../../../content/resources/resources.json" with { type: "json" };

import {
  parseEducationalResources,
  type EducationalResource,
} from "../../../domain/resources/resource";

const defaultResources = parseEducationalResources(rawResources);

const kindLabels: Record<EducationalResource["kind"], string> = {
  guide: "Guía educativa",
  planner: "Material para organizarte",
};

type ResourcesPageProps = {
  resources?: ReadonlyArray<EducationalResource>;
};

export function ResourcesPage({ resources = defaultResources }: ResourcesPageProps) {
  return (
    <section className="page-section resources-page" aria-labelledby="resources-title">
      <header className="resources-header">
        <p className="eyebrow">Biblioteca educativa</p>
        <h1 id="resources-title">Recursos para acompañar tu organización</h1>
        <p>
          Aquí encontrarás materiales complementarios para leer y conversar con
          profesionales. Son contenidos educativos generales: no sustituyen una
          indicación médica, nutricional o de actividad física personalizada.
        </p>
      </header>

      <div className="resources-grid">
        {resources.map((resource) => (
          <article className="resource-card" key={resource.id}>
            <div className="resource-card__motif" aria-hidden="true">
              <span />
            </div>
            <p className="resource-card__kind">{kindLabels[resource.kind]}</p>
            <h2>{resource.title}</h2>
            <p className="resource-card__summary">{resource.summary}</p>
            {resource.publicationStatus === "approved" ? (
              <a
                className="resource-card__action"
                href={resource.downloadPath}
                download
              >
                Descargar {resource.title}
              </a>
            ) : (
              <p className="resource-card__status">
                En revisión profesional
              </p>
            )}
          </article>
        ))}
      </div>

      <aside className="resources-disclaimer" aria-label="Uso responsable de los recursos">
        <strong>Antes de aplicar una recomendación</strong>
        <p>
          Considera tus indicaciones personales, tus medicamentos, tus
          condiciones y cualquier restricción indicada por tu equipo de salud.
        </p>
      </aside>
    </section>
  );
}
