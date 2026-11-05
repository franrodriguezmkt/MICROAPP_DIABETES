import { describe, expect, it } from "vitest";

import { prepareResourceContent } from "../../build/resourceContent";
import rawResources from "../../content/resources/resources.json";

const approvedResource = {
  id: "manual-intercambio-alimentos",
  title: "Manual de intercambio de alimentos",
  summary: "Material educativo revisado.",
  kind: "guide",
  publicationStatus: "approved",
  downloadPath: "/resources/manual-intercambio-alimentos.pdf",
} as const;

describe("production educational resource content", () => {
  it("publishes the four supplied educational PDFs", () => {
    const paths = [
      "/resources/manual-intercambio-alimentos.pdf",
      "/resources/planeadores-menu-actividad.pdf",
      "/resources/guia-ejercicios-diabetes.pdf",
      "/resources/prevencion-pie-diabetico.pdf",
    ];

    expect(prepareResourceContent(rawResources, paths)).toHaveLength(4);
    expect(rawResources).toEqual(
      expect.arrayContaining(
        paths.map((downloadPath) =>
          expect.objectContaining({ publicationStatus: "approved", downloadPath }),
        ),
      ),
    );
  });
  it("rejects_approved_metadata_when_the_local_pdf_does_not_exist", () => {
    expect(() => prepareResourceContent([approvedResource], [])).toThrow(
      /no existe en public\/resources/i,
    );
  });

  it("accepts_approved_metadata_only_when_the_local_pdf_is_in_the_inventory", () => {
    expect(
      prepareResourceContent(
        [approvedResource],
        ["/resources/manual-intercambio-alimentos.pdf"],
      ),
    ).toEqual([approvedResource]);
  });

  it("keeps_pending_resources_without_requiring_a_file", () => {
    expect(
      prepareResourceContent(
        [{ ...approvedResource, publicationStatus: "pending", downloadPath: undefined }],
        [],
      ),
    ).toHaveLength(1);
  });
});
