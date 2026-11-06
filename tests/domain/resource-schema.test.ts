import { describe, expect, it } from "vitest";

import {
  educationalResourceCollectionSchema,
  educationalResourceSchema,
} from "../../src/domain/resources/resource";

const baseResource = {
  id: "manual-intercambio-alimentos",
  title: "Manual de intercambio de alimentos",
  summary: "Material educativo para comprender opciones de intercambio.",
  kind: "guide",
} as const;

describe("educational resource schema", () => {
  it("accepts_the_four_known_resources_as_pending", () => {
    const result = educationalResourceCollectionSchema.parse([
      { ...baseResource, publicationStatus: "pending" },
      {
        ...baseResource,
        id: "planeadores",
        title: "Planeadores de menú y actividad",
        kind: "planner",
        publicationStatus: "pending",
      },
      {
        ...baseResource,
        id: "guia-ejercicios",
        title: "Guía de ejercicios",
        kind: "guide",
        publicationStatus: "pending",
      },
      {
        ...baseResource,
        id: "prevencion-pie-diabetico",
        title: "Prevención del pie diabético",
        kind: "guide",
        publicationStatus: "pending",
      },
    ]);

    expect(result).toHaveLength(4);
  });

  it("accepts_an_approved_local_pdf", () => {
    expect(
      educationalResourceSchema.parse({
        ...baseResource,
        publicationStatus: "approved",
        downloadPath: "/resources/manual-intercambio-alimentos.pdf",
      }),
    ).toMatchObject({ publicationStatus: "approved" });
  });

  it.each([
    "https://example.com/manual.pdf",
    "../manual.pdf",
    "/resources/manual.docx",
    "/resources/manual con espacios.pdf",
  ])("rejects_remote_traversal_or_non_pdf_paths: %s", (downloadPath) => {
    expect(() =>
      educationalResourceSchema.parse({
        ...baseResource,
        publicationStatus: "approved",
        downloadPath,
      }),
    ).toThrow();
  });

  it("rejects_an_approved_resource_without_a_file", () => {
    expect(() =>
      educationalResourceSchema.parse({
        ...baseResource,
        publicationStatus: "approved",
      }),
    ).toThrow();
  });

  it("rejects_a_pending_resource_with_a_download", () => {
    expect(() =>
      educationalResourceSchema.parse({
        ...baseResource,
        publicationStatus: "pending",
        downloadPath: "/resources/manual-intercambio-alimentos.pdf",
      }),
    ).toThrow();
  });
});
