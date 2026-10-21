import { describe, expect, it } from "vitest";

import { prepareResourceContent } from "../../build/resourceContent";

const approvedResource = {
  id: "manual-intercambio-alimentos",
  title: "Manual de intercambio de alimentos",
  summary: "Material educativo revisado.",
  kind: "guide",
  publicationStatus: "approved",
  downloadPath: "/resources/manual-intercambio-alimentos.pdf",
} as const;

describe("production educational resource content", () => {
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
