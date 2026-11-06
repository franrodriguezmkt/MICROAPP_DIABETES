import { useState } from "react";

import type { EducationalResource } from "../../../domain/resources/resource";

export type ResourceDownloader = (
  path: string,
  fileName: string,
) => Promise<void>;

export async function downloadResourceFile(path: string, fileName: string) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Resource download failed");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ResourceDownloadButton({
  resource,
  downloadResource = downloadResourceFile,
}: {
  resource: Extract<EducationalResource, { publicationStatus: "approved" }>;
  downloadResource?: ResourceDownloader;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const fileName = resource.downloadPath.slice("/resources/".length);

  async function startDownload() {
    setState("loading");
    try {
      await downloadResource(resource.downloadPath, fileName);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="resource-card__download">
      <button
        className="resource-card__action"
        type="button"
        onClick={startDownload}
        disabled={state === "loading"}
      >
        {state === "loading"
          ? "Preparando descarga…"
          : state === "error"
            ? `Reintentar descarga de ${resource.title}`
            : `Descargar ${resource.title}`}
      </button>
      {state === "success" ? (
        <p className="resource-card__feedback" role="status">
          Descarga iniciada.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="resource-card__feedback resource-card__feedback--error" role="alert">
          No pudimos descargar el archivo. Revisa tu conexión e intenta otra vez.
        </p>
      ) : null}
    </div>
  );
}
