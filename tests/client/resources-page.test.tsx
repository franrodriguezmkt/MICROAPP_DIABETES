import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResourcesPage } from "../../src/client/features/resources/ResourcesPage";
import { downloadResourceFile } from "../../src/client/features/resources/ResourceDownloadButton";
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

function renderResources(
  resources: EducationalResource[] = pendingResources,
  downloadResource?: (path: string, fileName: string) => Promise<void>,
) {
  return render(
    <MemoryRouter>
      <ResourcesPage resources={resources} downloadResource={downloadResource} />
    </MemoryRouter>,
  );
}

describe("educational resources library", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("exposes_only_an_approved_local_pdf", async () => {
    const user = userEvent.setup();
    renderResources([
      ...pendingResources.slice(1),
      {
        ...pendingResources[0],
        publicationStatus: "approved",
        downloadPath: "/resources/manual-intercambio-alimentos.pdf",
      },
    ], async () => undefined);

    const download = screen.getByRole("button", {
      name: /descargar manual de intercambio de alimentos/i,
    });
    await user.click(download);
    expect(await screen.findByRole("status")).toHaveTextContent(
      /descarga iniciada/i,
    );
    expect(screen.getAllByRole("button", { name: /descargar/i })).toHaveLength(1);
  });

  it("explains_a_failed_download_and_allows_retry", async () => {
    let attempt = 0;
    const user = userEvent.setup();
    renderResources(
      [
        {
          ...pendingResources[0],
          publicationStatus: "approved",
          downloadPath: "/resources/manual-intercambio-alimentos.pdf",
        },
      ],
      async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("network unavailable");
      },
    );

    await user.click(screen.getByRole("button", { name: /descargar manual/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no pudimos descargar/i,
    );

    await user.click(screen.getByRole("button", { name: /reintentar descarga/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /descarga iniciada/i,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects_an_unsuccessful_pdf_response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      downloadResourceFile("/resources/missing.pdf", "missing.pdf"),
    ).rejects.toThrow(/resource download failed/i);
  });

  it("downloads_the_real_pdf_response_and_releases_its_temporary_url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("pdf contents", { status: 200 }),
    );
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:resource");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadResourceFile(
      "/resources/manual-intercambio-alimentos.pdf",
      "manual-intercambio-alimentos.pdf",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/resources/manual-intercambio-alimentos.pdf",
      { credentials: "same-origin" },
    );
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:resource");
    expect(document.querySelector('a[download="manual-intercambio-alimentos.pdf"]')).toBeNull();
  });
});
