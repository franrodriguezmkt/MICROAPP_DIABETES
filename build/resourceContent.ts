import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

import {
  parseEducationalResources,
  type EducationalResource,
} from "../src/domain/resources/resource.ts";

const virtualModuleId = "virtual:resource-content";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

export function collectPublicResourcePaths(publicRoot: string): string[] {
  const resourceDirectory = join(publicRoot, "resources");
  if (!existsSync(resourceDirectory)) return [];

  return readdirSync(resourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pdf"))
    .map((entry) => `/resources/${entry.name}`);
}

export function prepareResourceContent(
  input: unknown,
  availablePaths: ReadonlyArray<string>,
): EducationalResource[] {
  const resources = parseEducationalResources(input);
  const available = new Set(availablePaths);

  const missing = resources.find(
    (resource) =>
      resource.publicationStatus === "approved" &&
      !available.has(resource.downloadPath),
  );
  if (missing?.publicationStatus === "approved") {
    throw new Error(
      `El recurso aprobado ${missing.id} apunta a ${missing.downloadPath}, pero el archivo no existe en public/resources.`,
    );
  }

  return resources;
}

export function resourceContentPlugin(
  input: unknown,
  publicRoot: string,
): Plugin {
  const resources = prepareResourceContent(
    input,
    collectPublicResourcePaths(publicRoot),
  );

  return {
    name: "validated-resource-content",
    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : null;
    },
    load(id) {
      return id === resolvedVirtualModuleId
        ? `export default ${JSON.stringify(resources)};`
        : null;
    },
  };
}
