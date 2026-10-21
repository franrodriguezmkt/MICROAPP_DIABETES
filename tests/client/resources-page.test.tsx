import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ResourcesPage } from "../../src/client/features/resources/ResourcesPage";
import type { EducationalResource } from "../../src/domain/resources/resource";

const pendingResources: EducationalResource[] = [
  {
    id: "manual-intercambio-alimentos",
    title: "Manual de intercambio de alimentos",
    summary: "Material educativo sobre intercambios.",
    kind: "guide",
    publicationStatus: "pending",
  },
  {
    id: "planeadores",
    title: "Planeadores de menú y actividad",
    summary: "Hojas prácticas para organizar la semana.",
    kind: "planner",
    publicationStatus: "pending",
  },
  {
    id: "guia-ejercicios",
    title: "Guía de ejercicios",
    summary: "Orientación educativa para conversar con profesionales.",
    kind: "guide",
    publicationStatus: "pending",
  },
  {
    id: "prevencion-pie-diabetico",
    title: "Prevención del pie diabético",
    summary: "Material educativo de autocuidado general.",
    kind: "guide",
    publicationStatus: "pending",
  },
];

function renderResources(resources: EducationalResource[] = pendingResources) {
  return render(
    <MemoryRouter>
      <ResourcesPage resources={resources} />
    </MemoryRouter>,
  );
}

describe("educational resources library", () => {
  it("shows_all_four_resources_with_educational_context", () => {
    renderResources();

    expect(
      screen.getByRole("heading", { level: 1, name: /recursos para acompañar tu organización/i }),
    ).toBeInTheDocument();
    pendingResources.forEach((resource) => {
      expect(screen.getByRole("heading", { name: resource.title })).toBeInTheDocument();
    });
    expect(screen.getByText(/no sustituyen una indicación médica/i)).toBeInTheDocument();
  });

  it("prevents_pending_resource_downloads", () => {
    renderResources();

    expect(screen.getAllByText(/en revisión profesional/i)).toHaveLength(4);
    expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument();
  });

  it("exposes_only_an_approved_local_pdf", () => {
    renderResources([
      ...pendingResources.slice(1),
      {
        ...pendingResources[0],
        publicationStatus: "approved",
        downloadPath: "/resources/manual-intercambio-alimentos.pdf",
      },
    ]);

    const download = screen.getByRole("link", {
      name: /descargar manual de intercambio de alimentos/i,
    });
    expect(download).toHaveAttribute(
      "href",
      "/resources/manual-intercambio-alimentos.pdf",
    );
    expect(download).toHaveAttribute("download");
    expect(screen.getAllByRole("link", { name: /descargar/i })).toHaveLength(1);
  });
});
